"""Application configuration settings."""

import os
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import validator


class Settings(BaseSettings):
    """Application settings configuration."""
    
    # Supabase Configuration
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    
<<<<<<< HEAD
    # Gmail SMTP Configuration (legacy)
    gmail_email: str
    gmail_app_password: str

    # SendGrid Configuration
    sendgrid_api_key: Optional[str] = None
    sendgrid_from_email: Optional[str] = None
    sendgrid_reply_to_email: Optional[str] = None
=======
    # Gmail SMTP Configuration
    gmail_email: str
    gmail_app_password: str
>>>>>>> e5c0c76 (Revert "Changed Email service to sendgrid from Gmail API")
    
    # Application Configuration
    environment: str = "development"
    secret_key: str
    cors_origins: str = ""
    cors_origin_regex: Optional[str] = None
    
    # Default Passwords (for development/testing)
    default_volunteer_password: str
    
    # Event Configuration
    event_name: str = "Volunteer Event 2024"
    event_date: str = "2024-01-01"
    
    @validator("cors_origins")
    def parse_cors_origins(cls, v: str) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        if not v or not v.strip():
            return []
        return [origin.strip() for origin in v.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


# Global settings instance
settings = Settings()
