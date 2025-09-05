"""Authentication API routes."""

from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer
from app.models.auth import (
    UserLogin, 
    Token, 
    UserResponse, 
    ChangePassword, 
    UserCreate,
    TokenData
)
from app.utils.auth import (
    verify_password, 
    create_access_token, 
    hash_password,
    get_current_user,
    get_current_president,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.utils.supabase_client import supabase_client
import logging

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)
security = HTTPBearer()


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Authenticate user and return JWT token."""
    try:
        # Get user from database
        user_data = await supabase_client.get_user_by_email(user_credentials.email)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(user_credentials.password, user_data["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user_data.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        # Update last login
        await supabase_client.update_user_last_login(user_data["id"])
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={
                "sub": user_data["id"],
                "email": user_data["email"],
                "role": user_data["role"]
            },
            expires_delta=access_token_expires
        )
        
        # Create user response
        user_response = UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            is_active=user_data["is_active"],
            created_at=user_data["created_at"],
            last_login=user_data.get("last_login")
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
            user=user_response
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current authenticated user information."""
    try:
        user_data = await supabase_client.get_user_by_id(current_user.user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            full_name=user_data["full_name"],
            role=user_data["role"],
            is_active=user_data["is_active"],
            created_at=user_data["created_at"],
            last_login=user_data.get("last_login")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: TokenData = Depends(get_current_user)
):
    """Change user password."""
    try:
        # Get current user data
        user_data = await supabase_client.get_user_by_id(current_user.user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not verify_password(password_data.current_password, user_data["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Hash new password
        new_password_hash = hash_password(password_data.new_password)
        
        # Update password in database using service client
        response = supabase_client.service_client.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", current_user.user_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Change password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )


@router.post("/create-user", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: TokenData = Depends(get_current_president)
):
    """Create a new user (president only)."""
    try:
        # Check if user already exists
        existing_user = await supabase_client.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Hash password
        password_hash = hash_password(user_data.password)
        
        # Create user data
        new_user_data = {
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role,
            "password_hash": password_hash,
            "is_active": user_data.is_active,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Create user in database
        created_user = await supabase_client.create_user(new_user_data)
        
        return UserResponse(
            id=created_user["id"],
            email=created_user["email"],
            full_name=created_user["full_name"],
            role=created_user["role"],
            is_active=created_user["is_active"],
            created_at=created_user["created_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create user error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )


@router.get("/users", response_model=list[UserResponse])
async def get_all_users(current_user: TokenData = Depends(get_current_president)):
    """Get all users (president only)."""
    try:
        users_data = await supabase_client.get_all_users()
        
        return [
            UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                role=user["role"],
                is_active=user["is_active"],
                created_at=user["created_at"],
                last_login=user.get("last_login")
            )
            for user in users_data
        ]
        
    except Exception as e:
        logger.error(f"Get all users error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get users"
        )
