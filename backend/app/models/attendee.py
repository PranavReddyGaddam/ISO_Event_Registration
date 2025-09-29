"""Pydantic models for attendees."""

from datetime import datetime
from typing import Optional, Literal, List, Generic, TypeVar
from pydantic import BaseModel, EmailStr, validator, Field
import uuid
from app.utils.email_validation import enhanced_email_validator

T = TypeVar('T')


class AttendeeBase(BaseModel):
    """Base attendee model."""
    name: str
    email: EmailStr
    phone: str
    ticket_quantity: int = Field(default=1, ge=1, le=20)
    payment_mode: Literal["cash", "zelle"] = Field(
        default="cash", description="Payment mode used by the attendee"
    )
    food_option: Literal["with_food", "without_food"] = Field(
        default="with_food", description="Food preference for the attendee"
    )
    
    @validator("name")
    def validate_name(cls, v: str) -> str:
        """Validate name is not empty."""
        if not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip()
    
    @validator("email")
    def validate_email(cls, v: str) -> str:
        """Enhanced email validation with typo detection."""
        return enhanced_email_validator(cls, v)
    
    @validator("phone")
    def validate_phone(cls, v: str) -> str:
        """Basic phone validation."""
        # Remove all non-digit characters
        phone_digits = "".join(filter(str.isdigit, v))
        if len(phone_digits) < 10:
            raise ValueError("Phone number must have at least 10 digits")
        return v.strip()
    
    @validator("ticket_quantity")
    def validate_ticket_quantity(cls, v: int) -> int:
        """Validate ticket quantity is within range."""
        if v < 1 or v > 20:
            raise ValueError("Ticket quantity must be between 1 and 20")
        return v
    


class AttendeeCreate(AttendeeBase):
    """Model for creating a new attendee."""
    is_guest: bool = Field(default=False, description="Whether this is a guest registration")


class AttendeeResponse(AttendeeBase):
    """Model for attendee response."""
    id: str
    qr_code_id: str
    total_price: float
    created_at: datetime
    checked_in_at: Optional[datetime] = None
    is_checked_in: bool = False
    qr_code_url: Optional[str] = None
    transaction_screenshot_url: Optional[str] = None
    
    # Volunteer information (who sold the ticket)
    created_by: Optional[str] = None
    volunteer_name: Optional[str] = None
    volunteer_email: Optional[str] = None
    volunteer_team_role: Optional[str] = None
    
    # Grouped view fields (optional - only present in grouped responses)
    total_tickets_per_person: Optional[int] = None
    total_registrations: Optional[int] = None
    total_cash_amount: Optional[float] = None
    total_zelle_amount: Optional[float] = None
    cash_registrations: Optional[int] = None
    zelle_registrations: Optional[int] = None
    with_food_registrations: Optional[int] = None
    without_food_registrations: Optional[int] = None
    checked_in_registrations: Optional[int] = None
    
    class Config:
        from_attributes = True


class CheckInRequest(BaseModel):
    """Model for check-in request."""
    qr_code_id: str


class CheckInResponse(BaseModel):
    """Model for check-in response."""
    success: bool
    attendee: AttendeeResponse
    message: str


class AttendeeFilter(BaseModel):
    """Model for filtering attendees."""
    checked_in: Optional[bool] = None
    search: Optional[str] = None
    limit: int = 100
    offset: int = 0
    
    @validator("limit")
    def validate_limit(cls, v: int) -> int:
        """Validate limit is reasonable."""
        if v > 1000:
            raise ValueError("Limit cannot exceed 1000")
        return v


class EventStats(BaseModel):
    """Model for event statistics."""
    total_registered: int
    total_checked_in: int
    checked_in_percentage: float
    total_tickets_sold: int
    total_revenue: float
    revenue_cash: float
    revenue_zelle: float
    recent_checkins: list[AttendeeResponse]


class ApiResponse(BaseModel):
    """Generic API response model."""
    success: bool
    message: Optional[str] = None
    data: Optional[dict] = None


class QRCodeResponse(BaseModel):
    """Model for QR code response."""
    qr_code_id: str
    qr_code_url: str
    expires_at: Optional[datetime] = None


class TicketPricingBase(BaseModel):
    """Base ticket pricing model."""
    quantity_from: int = Field(ge=1, description="Starting quantity for this pricing tier (inclusive)")
    quantity_to: int = Field(ge=1, description="Ending quantity for this pricing tier (inclusive)")
    price_per_ticket: float = Field(ge=0, description="Price per ticket for this quantity range")
    is_active: bool = Field(default=True, description="Whether this pricing tier is currently active")
    food_option: Literal["with_food", "without_food"] = Field(description="Food option for this pricing tier")
    
    @validator("quantity_to")
    def validate_quantity_range(cls, v: int, values: dict) -> int:
        """Validate quantity range is valid."""
        if "quantity_from" in values and v < values["quantity_from"]:
            raise ValueError("quantity_to must be greater than or equal to quantity_from")
        return v


class TicketPricingCreate(TicketPricingBase):
    """Model for creating ticket pricing."""
    event_id: str


class TicketPricingUpdate(TicketPricingBase):
    """Model for updating ticket pricing."""
    pass


class TicketPricingResponse(TicketPricingBase):
    """Model for ticket pricing response."""
    id: str
    event_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class TicketPricingTier(BaseModel):
    """Model for a single pricing tier."""
    quantity_from: int
    quantity_to: int
    price_per_ticket: float
    total_price: float  # Calculated field for display
    food_option: Literal["with_food", "without_food"] = Field(description="Food option for this pricing tier")


class TicketPricingInfo(BaseModel):
    """Model for ticket pricing information."""
    tiers: list[TicketPricingTier]
    max_tickets: int = 20


class TicketCalculationRequest(BaseModel):
    """Model for ticket price calculation request."""
    quantity: int = Field(ge=1, le=20, description="Number of tickets to calculate price for")
    food_option: Literal["with_food", "without_food"] = Field(description="Food option for pricing calculation")


class TicketCalculationResponse(BaseModel):
    """Model for ticket price calculation response."""
    quantity: int
    price_per_ticket: float
    total_price: float
    pricing_tier: TicketPricingTier


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    total: int
    limit: int
    offset: int
    total_pages: int
    current_page: int
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    data: List[T]
    pagination: PaginationMeta
