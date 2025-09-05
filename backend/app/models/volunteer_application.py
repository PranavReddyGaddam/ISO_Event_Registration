from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VolunteerApplicationBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full name of the volunteer")
    email: EmailStr = Field(..., description="Email address of the volunteer")
    phone: str = Field(..., description="Phone number of the volunteer")
    
    @validator('phone')
    def validate_phone(cls, v):
        # Remove all non-digit characters
        digits_only = ''.join(filter(str.isdigit, v))
        if len(digits_only) < 10:
            raise ValueError('Phone number must have at least 10 digits')
        return v


class VolunteerApplicationCreate(VolunteerApplicationBase):
    pass


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
    
    @validator('rejection_reason')
    def validate_rejection_reason(cls, v, values):
        if values.get('status') == ApplicationStatus.REJECTED and not v:
            raise ValueError('Rejection reason is required when status is rejected')
        return v


class VolunteerApplicationApproval(BaseModel):
    status: ApplicationStatus = ApplicationStatus.APPROVED


class VolunteerApplicationRejection(BaseModel):
    status: ApplicationStatus = ApplicationStatus.REJECTED
    rejection_reason: str = Field(..., min_length=1, description="Reason for rejection")
