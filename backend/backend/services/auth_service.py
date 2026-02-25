"""
Authentication service for user authentication and profile management.

This module handles communication with the external authentication API
for user login and profile retrieval.
"""

import json
import httpx
from typing import Dict
from fastapi import HTTPException

from config.constants import AUTH_API_BASE_URL
from utils.audit_logger import log_error, log_warning
from utils.http_client import get_http_client


async def authenticate_user(email: str, password: str, entity_type: str) -> Dict:
    """
    Authenticate a user with the external authentication API.
    
    Args:
        email: User's email address
        password: User's password
        entity_type: Type of entity (e.g., "COMPANY", "SUPPLIER")
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating authentication success
        - token: JWT authentication token
        - raw_response: Full API response data
        
    Raises:
        HTTPException: If authentication fails or API is unavailable
    """
    try:
        client = get_http_client()
        url = f"{AUTH_API_BASE_URL}/authentication/authenticate"
        response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                json={
                    "email": email,
                    "password": password,
                    "entityType": entity_type
                },
                timeout=30.0
            )
            
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Try different possible token field names
                token = (data.get("token") or 
                        data.get("access_token") or 
                        data.get("jwt") or 
                        data.get("jwtToken") or
                        data.get("data", {}).get("token") or
                        data.get("data", {}).get("jwtToken"))
                
                if not token:
                    log_warning(
                        "No token found in authentication response",
                        details={"response_keys": list(data.keys()) if isinstance(data, dict) else "Not a dict"}
                    )
                    raise HTTPException(
                        status_code=500,
                        detail="Authentication successful but no token received"
                    )
                
                return {
                    "success": True,
                    "token": token,
                    "raw_response": data
                }
            except json.JSONDecodeError as e:
                log_error(
                    "Error parsing JSON response from authentication service",
                    details={"error": str(e), "response_preview": response.text[:500]},
                    exc_info=True
                )
                raise HTTPException(
                    status_code=500,
                    detail="Invalid JSON response from authentication service"
                )
        else:
            error_detail = "Authentication failed"
            try:
                error_data = response.json()
                error_detail = error_data.get("message", error_data.get("error", error_data.get("detail", error_detail)))
            except:
                error_detail = response.text or error_detail
            
            log_warning(
                "Authentication failed",
                details={"status_code": response.status_code, "error": error_detail, "email": email}
            )
            
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
    except httpx.TimeoutException:
        log_error("Authentication request timed out", details={"email": email})
        raise HTTPException(status_code=504, detail="Authentication request timed out")
    except httpx.RequestError as e:
        log_error(
            "Request error during authentication",
            details={"error": str(e), "email": email},
            exc_info=True
        )
        raise HTTPException(status_code=503, detail="Failed to connect to authentication service")
    except HTTPException:
        raise
    except Exception as e:
        log_error(
            "Unexpected error in authenticate_user",
            details={"error": str(e), "email": email},
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Unexpected error during authentication")


async def get_user_details(token: str) -> Dict:
    """
    Fetch user details using an authentication token.
    
    Tries multiple possible API endpoints to retrieve user information.
    If all API endpoints fail, attempts to decode the JWT token directly.
    
    Args:
        token: JWT authentication token
        
    Returns:
        Dictionary containing:
        - success: Boolean indicating success
        - name: User's full name
        - userid: User's ID
        - entityid: Company/entity ID
        - raw_response: Full API response or JWT payload
        
    Raises:
        HTTPException: If user details cannot be retrieved
    """
    # Try multiple possible endpoints
    possible_endpoints = [
        f"{AUTH_API_BASE_URL}/user",
        f"{AUTH_API_BASE_URL}/user/profile",
        f"{AUTH_API_BASE_URL}/authentication/user",
        f"{AUTH_API_BASE_URL}/me",
    ]
    
    client = get_http_client()
    for endpoint in possible_endpoints:
        try:
            response = await client.get(
                endpoint,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "name": data.get("name") or data.get("userName") or data.get("fullName"),
                    "userid": data.get("userid") or data.get("userId") or data.get("id"),
                    "entityid": data.get("entityid") or data.get("entityId") or data.get("entity_id"),
                    "raw_response": data
                }
        except httpx.HTTPStatusError:
            continue  # Try next endpoint
        except Exception:
            continue  # Try next endpoint
    
    # If all endpoints fail, try to decode JWT token directly
    try:
        import base64
        # JWT tokens have 3 parts separated by dots
        parts = token.split('.')
        if len(parts) >= 2:
            # Decode the payload (second part)
            payload = parts[1]
            # Add padding if needed
            payload += '=' * (4 - len(payload) % 4)
            decoded = base64.urlsafe_b64decode(payload)
            jwt_data = json.loads(decoded)
            
            return {
                "success": True,
                "name": jwt_data.get("name") or jwt_data.get("userName") or jwt_data.get("fullName"),
                "userid": jwt_data.get("userid") or jwt_data.get("userId") or jwt_data.get("sub") or jwt_data.get("id"),
                "entityid": jwt_data.get("entityid") or jwt_data.get("entityId") or jwt_data.get("entity_id"),
                "raw_response": jwt_data
            }
    except Exception:
        pass
    
    raise HTTPException(
        status_code=404,
        detail="Could not fetch user details. Please check the API endpoint."
    )
