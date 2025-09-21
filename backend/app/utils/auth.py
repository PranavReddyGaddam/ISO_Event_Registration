"""Authentication utilities for JWT and password handling."""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.models.auth import TokenData, UserRole
import logging

logger = logging.getLogger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__default_rounds=12)

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

# Security scheme
security = HTTPBearer()


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> TokenData:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        exp: datetime = datetime.fromtimestamp(payload.get("exp"))
        
        if user_id is None or email is None or role is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return TokenData(
            user_id=user_id,
            email=email,
            role=UserRole(role),
            exp=exp
        )
        
    except JWTError as e:
        logger.error(f"JWT decode error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please log out and login again",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError as e:
        logger.error(f"Invalid role in token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user role",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    return decode_access_token(token)


async def get_current_president(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user is a president."""
    if current_user.role != UserRole.PRESIDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only presidents can access this resource"
        )
    return current_user


async def get_current_volunteer_or_president(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user is a volunteer or president."""
    if current_user.role not in [UserRole.VOLUNTEER, UserRole.PRESIDENT]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    return current_user


async def get_current_finance_director(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user is a finance director."""
    if current_user.role != UserRole.FINANCE_DIRECTOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only finance directors can access this resource"
        )
    return current_user


async def get_current_president_or_finance_director(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user is a president or finance director."""
    if current_user.role not in [UserRole.PRESIDENT, UserRole.FINANCE_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only presidents and finance directors can access this resource"
        )
    return current_user


async def get_current_leaderboard_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user has leaderboard access (volunteer, president, or finance director)."""
    if current_user.role not in [UserRole.VOLUNTEER, UserRole.PRESIDENT, UserRole.FINANCE_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only volunteers, presidents, and finance directors can access the leaderboard"
        )
    return current_user


async def get_current_dashboard_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Ensure current user has dashboard access (president or finance director)."""
    if current_user.role not in [UserRole.PRESIDENT, UserRole.FINANCE_DIRECTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied - insufficient permissions"
        )
    return current_user


def create_default_users() -> list[dict]:
    """Create default users for the system."""
    from app.config import settings
    
    return [
        {
            "email": settings.gmail_email,  # Use the configured email
            "full_name": "System Administrator",
            "role": UserRole.PRESIDENT,
            "password_hash": hash_password(settings.default_volunteer_password),
            "is_active": True,
        }
    ]
