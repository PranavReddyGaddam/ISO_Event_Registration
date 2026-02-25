"""Authentication models and schemas."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, validator
from enum import Enum
import uuid


class UserRole(str, Enum):
    """User roles in the system."""
    PRESIDENT = "president"
    VOLUNTEER = "volunteer"
    FINANCE_DIRECTOR = "finance_director"


class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    cleared_amount: float = 0.0
    
    @validator("full_name")
    def validate_full_name(cls, v: str) -> str:
        """Validate full name is not empty."""
        if not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip()


class UserCreate(UserBase):
    """Model for creating a new user."""
    password: str
    
    @validator("password")
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class UserLogin(BaseModel):
    """Model for user login."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Model for user response."""
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str
    email: str
    role: UserRole
    exp: datetime


class ChangePassword(BaseModel):
    """Model for changing password."""
    current_password: str
    new_password: str
    
    @validator("new_password")
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class UserUpdate(BaseModel):
    """Model for updating user."""
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator("full_name")
    def validate_full_name(cls, v: Optional[str]) -> Optional[str]:
        """Validate full name if provided."""
        if v is not None and not v.strip():
            raise ValueError("Full name cannot be empty")
        return v.strip() if v else None


class UpdateClearedAmount(BaseModel):
    """Model for updating cleared amount."""
    cleared_amount: float
    event_id: Optional[str] = None

    @validator("cleared_amount")
    def validate_cleared_amount(cls, v: float) -> float:
        """Validate cleared amount is non-negative."""
        if v < 0:
            raise ValueError("Cleared amount cannot be negative")
        return v


class ForgotPassword(BaseModel):
    """Model for forgot password request."""
    email: EmailStr


class ResetPassword(BaseModel):
    """Model for resetting password with token."""
    token: str
    new_password: str
    
    @validator("token")
    def validate_token(cls, v: str) -> str:
        """Validate token is not empty."""
        if not v.strip():
            raise ValueError("Reset token is required")
        return v.strip()
    
    @validator("new_password")
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class PasswordResetToken(BaseModel):
    """Model for password reset token response."""
    token: str
    expires_at: datetime
    
    class Config:
        from_attributes = True