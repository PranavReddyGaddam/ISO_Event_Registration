from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, ClassVar, List
from datetime import datetime
from enum import Enum
from app.utils.email_validation import enhanced_email_validator


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VolunteerApplicationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full name of the volunteer")
    email: EmailStr = Field(..., description="Email address of the volunteer")
    phone: str = Field(..., description="Phone number of the volunteer")
    team_role: Optional[str] = Field(None, description="Team role selected by the applicant/president")

    # Allowed roles (shared across models through Base)
    ALLOWED_ROLES: ClassVar[List[str]] = [
        "Marketing Team Member",
        "Social Media Team Member",
        "Finance Team Member",
        "Alumni Team Member",
        "Events Team Member",
        "Director",
        "Secretary",
        "Vice President",
        "President",
    ]
    
    @validator('email')
    def validate_email(cls, v):
        """Enhanced email validation with typo detection."""
        return enhanced_email_validator(cls, v)
    
    @validator('phone')
    def validate_phone(cls, v):
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, v))
        if len(digits_only) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        return v

    @validator('team_role')
    def validate_team_role(cls, v):
        if v is None or v == "":
            return None
        if v not in cls.ALLOWED_ROLES:
            raise ValueError('team_role must be one of the predefined roles')
        return v


class VolunteerApplicationCreate(VolunteerApplicationBase):
    team_role: str = Field(..., description="Required team role for the applicant")

    @validator('team_role')
    def validate_team_role_create(cls, v):
        if v not in VolunteerApplicationBase.ALLOWED_ROLES:
            raise ValueError('team_role must be one of the predefined roles')
        return v


class VolunteerApplicationResponse(VolunteerApplicationBase):
    id: str
    status: ApplicationStatus
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class VolunteerApplicationUpdate(BaseModel):
    status: ApplicationStatus
    rejection_reason: Optional[str] = None
    team_role: Optional[str] = None
    
    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if values.get('status') == ApplicationStatus.REJECTED and not v:
            raise ValueError('Rejection reason is required when status is rejected')
        return v

    @validator('team_role')
    def validate_team_role_update(cls, v):
        if v is None or v == "":
            return None
        if v not in VolunteerApplicationBase.ALLOWED_ROLES:
            raise ValueError('team_role must be one of the predefined roles')
        return v


class VolunteerApplicationApproval(BaseModel):
    status: ApplicationStatus = ApplicationStatus.APPROVED


class VolunteerApplicationRejection(BaseModel):
    status: ApplicationStatus = ApplicationStatus.REJECTED
    rejection_reason: str = Field(..., min_length=1, description="Reason for rejection")
