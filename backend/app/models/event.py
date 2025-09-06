"""Event models for the API."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, validator


class EventBase(BaseModel):
    """Base event model."""
    name: str
    description: str
    event_date: str
    location: str

    @validator("event_date")
    def validate_event_date(cls, v):
        """Validate event date format."""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError("Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")


class EventCreate(EventBase):
    """Event creation model."""
    pass


class EventUpdate(BaseModel):
    """Event update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None

    @validator("event_date")
    def validate_event_date(cls, v):
        """Validate event date format if provided."""
        if v is not None:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
                return v
            except ValueError:
                raise ValueError("Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
        return v


class EventResponse(EventBase):
    """Event response model."""
    id: str
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True
