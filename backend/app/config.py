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
    
    # Gmail SMTP Configuration
    gmail_email: str
    gmail_app_password: str
    
    # Application Configuration
    environment: str = "development"
    secret_key: str
    cors_origins: str = "http://localhost:5173"
    
    # Default Passwords (for development/testing)
    default_volunteer_password: str
    
    # Event Configuration
    event_name: str = "Volunteer Event 2024"
    event_date: str = "2024-01-01"
    
    @validator("cors_origins")
    def parse_cors_origins(cls, v: str) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in v.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
