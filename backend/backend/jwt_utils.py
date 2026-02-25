import json
import base64
from typing import Optional, Dict
from fastapi import HTTPException


def decode_jwt_token(token: str) -> Dict:
    """
    Decode JWT token and extract payload.
    
    Args:
        token: JWT token string
        
    Returns:
        Dictionary containing the decoded JWT payload
        
    Raises:
        HTTPException: If token is invalid or cannot be decoded
    """
    try:
        parts = token.split('.')
        if len(parts) < 2:
            raise HTTPException(
                status_code=401,
                detail="Invalid JWT token format"
            )
        
        # Decode the payload (second part)
        payload = parts[1]
        # Add padding if needed (base64 requires padding to be multiple of 4)
        payload += '=' * (4 - len(payload) % 4)
        
        # Decode from base64
        decoded = base64.urlsafe_b64decode(payload)
        jwt_data = json.loads(decoded)
        
        return jwt_data
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Failed to decode JWT token: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid JWT token: {str(e)}"
        )


def get_company_id_from_token(token: str) -> int:
    """
    Extract company ID from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Company ID as integer
        
    Raises:
        HTTPException: If company ID is not found in token or token is invalid
    """
    jwt_data = decode_jwt_token(token)
    
    # Try different possible field names for company/entity ID
    company_id = (
        jwt_data.get("entityid") or 
        jwt_data.get("entityId") or 
        jwt_data.get("entity_id") or
        jwt_data.get("companyId") or
        jwt_data.get("company_id")
    )
    
    if company_id is None:
        raise HTTPException(
            status_code=400,
            detail="Company ID not found in JWT token. Please ensure you are authenticated with a valid company account."
        )
    
    # Convert to int if it's a string
    try:
        return int(company_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid company ID format in token: {company_id}"
        )


def get_user_id_from_token(token: str) -> Optional[int]:
    """
    Extract user ID from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID as integer, or None if not found
        
    Raises:
        HTTPException: If token is invalid
    """
    jwt_data = decode_jwt_token(token)
    
    # Try different possible field names for user ID
    user_id = (
        jwt_data.get("userid") or 
        jwt_data.get("userId") or 
        jwt_data.get("sub") or  # 'sub' is a standard JWT claim for subject (user)
        jwt_data.get("id") or
        jwt_data.get("user_id")
    )
    
    if user_id is None:
        return None
    
    # Convert to int if it's a string
    try:
        return int(user_id)
    except (ValueError, TypeError):
        return None


def get_user_name_from_token(token: str) -> Optional[str]:
    """
    Extract user name from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User name as string, or None if not found
        
    Raises:
        HTTPException: If token is invalid
    """
    jwt_data = decode_jwt_token(token)
    
    # Try different possible field names for user name
    return (
        jwt_data.get("name") or 
        jwt_data.get("userName") or 
        jwt_data.get("fullName") or
        jwt_data.get("user_name")
    )


def get_user_first_name_from_token(token: str) -> Optional[str]:
    """
    Extract user's first name from JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User's first name as string, or None if not found
        
    Raises:
        HTTPException: If token is invalid
    """
    jwt_data = decode_jwt_token(token)
    
    # Try different possible field names for first name
    return (
        jwt_data.get("firstName") or 
        jwt_data.get("firstname") or 
        jwt_data.get("first_name") or
        jwt_data.get("givenName") or
        jwt_data.get("given_name")
    )
