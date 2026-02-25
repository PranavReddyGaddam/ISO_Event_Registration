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
    TokenData,
    UpdateClearedAmount,
    ForgotPassword,
    ResetPassword
)
from app.utils.auth import (
    verify_password, 
    create_access_token, 
    hash_password,
    get_current_user,
    get_current_president,
    get_current_president_or_finance_director,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.utils.supabase_client import supabase_client
import logging

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)
security = HTTPBearer()


def _get_frontend_url_for_email() -> str:
    """Get the appropriate frontend URL for email links based on environment."""
    from app.config import settings
    
    cors_origins = settings.cors_origins if isinstance(settings.cors_origins, list) else []
    
    # In production, prefer non-localhost URLs
    production_urls = [url for url in cors_origins if not url.startswith('http://localhost')]
    if production_urls:
        # Return the first production URL (usually your main domain)
        return production_urls[0]
    
    # Fallback to localhost for development
    localhost_urls = [url for url in cors_origins if url.startswith('http://localhost')]
    if localhost_urls:
        return localhost_urls[0]
    
    # Ultimate fallback
    return "http://localhost:5173"


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


@router.patch("/users/{user_id}/cleared-amount", response_model=UserResponse)
async def update_cleared_amount(
    user_id: str,
    cleared_data: UpdateClearedAmount,
    current_user: TokenData = Depends(get_current_president_or_finance_director)
):
    """Update the cleared amount for a volunteer by adding to existing amount (incremental clearing)."""
    try:
        # Get the user to verify they exist and are a volunteer
        user = await supabase_client.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Only allow updating cleared amount for volunteers
        if user.get("role") != "volunteer":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only update cleared amount for volunteers"
            )
        
        if cleared_data.event_id:
            # Per-event clearing: upsert into volunteer_event_cleared_amounts
            existing_resp = (
                supabase_client.service_client
                .table("volunteer_event_cleared_amounts")
                .select("id, cleared_amount")
                .eq("volunteer_id", user_id)
                .eq("event_id", cleared_data.event_id)
                .execute()
            )
            existing = existing_resp.data[0] if existing_resp.data else None
            current_event_cleared = float(existing["cleared_amount"]) if existing else 0.0
            new_event_cleared = current_event_cleared + cleared_data.cleared_amount

            if existing:
                supabase_client.service_client.table("volunteer_event_cleared_amounts").update(
                    {"cleared_amount": new_event_cleared, "updated_by": current_user.user_id}
                ).eq("id", existing["id"]).execute()
            else:
                supabase_client.service_client.table("volunteer_event_cleared_amounts").insert({
                    "volunteer_id": user_id,
                    "event_id": cleared_data.event_id,
                    "cleared_amount": new_event_cleared,
                    "updated_by": current_user.user_id,
                }).execute()

            return UserResponse(
                id=user["id"],
                email=user["email"],
                full_name=user["full_name"],
                role=user["role"],
                is_active=user["is_active"],
                cleared_amount=new_event_cleared,
                created_at=user["created_at"],
                last_login=user.get("last_login")
            )

        # No event_id: fall back to updating the global cleared_amount on users table
        current_cleared = float(user.get("cleared_amount", 0.0))
        new_total_cleared = current_cleared + cleared_data.cleared_amount

        updated_user = await supabase_client.update_user_cleared_amount(
            user_id=user_id,
            cleared_amount=new_total_cleared
        )

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update cleared amount"
            )

        return UserResponse(
            id=updated_user["id"],
            email=updated_user["email"],
            full_name=updated_user["full_name"],
            role=updated_user["role"],
            is_active=updated_user["is_active"],
            cleared_amount=updated_user["cleared_amount"],
            created_at=updated_user["created_at"],
            last_login=updated_user.get("last_login")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update cleared amount error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update cleared amount"
        )


@router.post("/forgot-password")
async def forgot_password(request: ForgotPassword):
    """Send password reset email."""
    try:
        # Check if user exists
        user_data = await supabase_client.get_user_by_email(request.email)
        if not user_data:
            # Don't reveal if email exists or not for security
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        # Check if user is active
        if not user_data.get("is_active", True):
            return {"message": "If an account with that email exists, a password reset link has been sent."}
        
        # Generate secure reset token
        import secrets
        import string
        
        # Create a secure random token
        alphabet = string.ascii_letters + string.digits
        reset_token = ''.join(secrets.choice(alphabet) for _ in range(64))
        
        # Set expiration time (30 minutes from now)
        expires_at = datetime.utcnow() + timedelta(minutes=30)
        
        # Create reset token in database
        token_record = await supabase_client.create_password_reset_token(
            user_id=user_data["id"],
            token=reset_token,
            expires_at=expires_at.isoformat()
        )
        
        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create reset token"
            )
        
        # Send reset email
        from app.utils.email_provider import get_email_sender
        from app.config import settings
        
        email_sender = get_email_sender()
        
        # Create reset URL (automatically uses correct URL based on environment)
        # Get the primary frontend URL from CORS origins
        frontend_url = _get_frontend_url_for_email()
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Email content
        subject = "Password Reset Request"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
                <p style="color: #666; line-height: 1.6;">
                    Hello {user_data['full_name']},
                </p>
                <p style="color: #666; line-height: 1.6;">
                    You requested a password reset for your account. Click the button below to reset your password:
                </p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #666; line-height: 1.6; font-size: 14px;">
                    If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="color: #007bff; font-size: 14px; word-break: break-all;">
                    {reset_url}
                </p>
                <p style="color: #666; line-height: 1.6; font-size: 14px;">
                    This link will expire in 30 minutes for security reasons.
                </p>
                <p style="color: #666; line-height: 1.6; font-size: 14px;">
                    If you didn't request this password reset, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                <p style="color: #999; font-size: 12px; text-align: center;">
                    This is an automated message. Please do not reply to this email.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        Password Reset Request
        
        Hello {user_data['full_name']},
        
        You requested a password reset for your account. Please visit the following link to reset your password:
        
        {reset_url}
        
        This link will expire in 30 minutes for security reasons.
        
        If you didn't request this password reset, please ignore this email.
        
        This is an automated message. Please do not reply to this email.
        """
        
        # Send email
        await email_sender.send_email(
            to_email=request.email,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )
        
        return {"message": "If an account with that email exists, a password reset link has been sent."}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process password reset request"
        )


@router.post("/reset-password")
async def reset_password(request: ResetPassword):
    """Reset password using token."""
    try:
        # Validate reset token
        token_data = await supabase_client.get_password_reset_token(request.token)
        if not token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        # Get user data
        user_data = await supabase_client.get_user_by_id(token_data["user_id"])
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Hash new password
        new_password_hash = hash_password(request.new_password)
        
        # Update password in database
        response = supabase_client.service_client.table("users").update({
            "password_hash": new_password_hash,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", token_data["user_id"]).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update password"
            )
        
        # Mark token as used
        await supabase_client.mark_password_reset_token_used(request.token)
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )
