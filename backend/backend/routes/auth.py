"""
Authentication route handlers.

This module handles user authentication and profile information retrieval.
"""

import json
import base64
from fastapi import APIRouter, HTTPException

from models.schemas import AuthRequest, TokenValidationRequest
from services.auth_service import authenticate_user, get_user_details
from utils.audit_logger import log_action, log_error, log_warning
from jwt_utils import decode_jwt_token, get_user_name_from_token

# Create router for authentication endpoints
router = APIRouter()


@router.post("/auth/authenticate")
async def authenticate(auth_request: AuthRequest):
    """
    Authenticate user and return JWT token along with user details.
    
    Args:
        auth_request: AuthRequest model containing email, password, and entityType
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating authentication success
        - token: JWT authentication token
        - user: Dictionary with name, userid, and entityid
        - warning: Optional warning message if user details unavailable
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Authenticate and get token
        auth_result = await authenticate_user(
            auth_request.email,
            auth_request.password,
            auth_request.entityType
        )
        
        token = auth_result["token"]

        # Try to fetch user details using the token
        # If it fails, we'll still return the token and try to decode it
        try:
            user_details = await get_user_details(token)
            
            # Log successful authentication
            log_action("user_authenticated", details={
                "email": auth_request.email,
                "user_id": user_details.get("userid")
            })

            return {
                "success": True,
                "token": token,
                "user": {
                    "name": user_details.get("name"),
                    "userid": user_details.get("userid"),
                    "entityid": user_details.get("entityid")
                }
            }
        except HTTPException as e:
            # If get_user_details fails, try to decode JWT token directly
            log_warning(f"Could not fetch user details from API: {e.detail}")
            try:
                parts = token.split('.')
                if len(parts) >= 2:
                    payload = parts[1]
                    payload += '=' * (4 - len(payload) % 4)
                    decoded = base64.urlsafe_b64decode(payload)
                    jwt_data = json.loads(decoded)
                    
                    user_id = jwt_data.get("userid") or jwt_data.get("userId") or jwt_data.get("sub") or jwt_data.get("id")
                    
                    # Log successful authentication
                    log_action("user_authenticated", details={
                        "email": auth_request.email,
                        "user_id": user_id
                    })

                    return {
                        "success": True,
                        "token": token,
                        "user": {
                            "name": jwt_data.get("name") or jwt_data.get("userName") or jwt_data.get("fullName"),
                            "userid": user_id,
                            "entityid": jwt_data.get("entityid") or jwt_data.get("entityId") or jwt_data.get("entity_id")
                        }
                    }
            except Exception as decode_error:
                log_error(f"Error decoding JWT token", details=str(decode_error))
                # Return token even if we can't get user details
                log_action("user_authenticated", details={"email": auth_request.email})
                return {
                    "success": True,
                    "token": token,
                    "user": {
                        "name": None,
                        "userid": None,
                        "entityid": None
                    },
                    "warning": "Could not fetch user details, but authentication was successful"
                }
    except HTTPException as e:
        log_error(f"Authentication failed", details={"status_code": e.status_code, "detail": e.detail})
        raise e
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        log_error(f"Unexpected error in authenticate", details=error_trace, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Authentication error: {str(e)}")
    

@router.post("/auth/validate-token")
async def validate_token(token_request: TokenValidationRequest):
    """
    Validate an existing JWT token and return user details.
    This endpoint works with tokens from the parent website.
    
    Args:
        token_request: TokenValidationRequest model containing token field
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating token validity
        - token: The validated token
        - user: Dictionary with name, userid, and entityid
    """":"
    try:
        token = token_request.token
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        # Decode and validate token
        jwt_data = decode_jwt_token(token)
        
        # Extract user details from token
        user_id = (
            jwt_data.get("userid") or 
            jwt_data.get("userId") or 
            jwt_data.get("sub") or 
            jwt_data.get("id")
        )
        
        entity_id = (
            jwt_data.get("entityid") or 
            jwt_data.get("entityId") or 
            jwt_data.get("entity_id")
        )
        
        user_name = get_user_name_from_token(token)
        
        # Log successful validation
        log_action("token_validated", details={
            "user_id": user_id,
            "entity_id": entity_id
        })
        
        return {
            "success": True,
            "token": token,
            "user": {
                "name": user_name,
                "userid": user_id,
                "entityid": entity_id
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Token validation failed", details=str(e))
        raise HTTPException(status_code=401, detail=f"Invalid or expired token: {str(e)}")