"""Models package for data validation and schemas."""

from .attendee import AttendeeBase, AttendeeCreate, AttendeeResponse
from .auth import UserLogin, Token, UserResponse, ChangePassword, UserCreate, TokenData, UserRole
from .event import EventBase, EventCreate, EventUpdate, EventResponse
from .volunteer_application import VolunteerApplicationBase, VolunteerApplicationCreate, VolunteerApplicationResponse, VolunteerApplicationUpdate, VolunteerApplicationStatus