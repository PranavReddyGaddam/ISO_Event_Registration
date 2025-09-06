"""Event management API routes."""

from datetime import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.event import EventCreate, EventUpdate, EventResponse
from app.models.auth import TokenData
from app.utils.auth import get_current_president
from app.utils.supabase_client import supabase_client
import logging

router = APIRouter(prefix="/api/events", tags=["events"])
logger = logging.getLogger(__name__)


@router.get("/", response_model=list[EventResponse])
async def get_events():
    """Get all events."""
    try:
        response = supabase_client.client.table("events").select("*").order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error getting events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve events"
        )


@router.get("/current", response_model=EventResponse)
async def get_current_event():
    """Get the current active event."""
    try:
        response = supabase_client.client.table("events").select("*").order("created_at", desc=True).limit(1).execute()
        if not response.data:
            # Create a default event if none exists
            default_event = await create_default_event()
            return default_event
        
        return response.data[0]
    except Exception as e:
        logger.error(f"Error getting current event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve current event"
        )


@router.post("/", response_model=EventResponse)
async def create_event(
    event_data: EventCreate,
    current_user: TokenData = Depends(get_current_president)
):
    """Create a new event (president only)."""
    try:
        # Add timestamps
        event_data_dict = event_data.dict()
        event_data_dict["created_at"] = datetime.utcnow().isoformat()
        event_data_dict["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase_client.client.table("events").insert(event_data_dict).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create event"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event"
        )


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_data: EventUpdate,
    current_user: TokenData = Depends(get_current_president)
):
    """Update an existing event (president only)."""
    try:
        # Add updated timestamp
        update_data = event_data.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase_client.client.table("events").update(update_data).eq("id", event_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update event"
        )


@router.delete("/{event_id}")
async def delete_event(
    event_id: str,
    current_user: TokenData = Depends(get_current_president)
):
    """Delete an event (president only)."""
    try:
        response = supabase_client.client.table("events").delete().eq("id", event_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event not found"
            )
        
        return {"message": "Event deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete event"
        )


async def create_default_event() -> EventResponse:
    """Create a default event if none exists."""
    try:
        from datetime import datetime, timedelta
        
        # Create an event for next month
        event_date = datetime.utcnow() + timedelta(days=30)
        
        event_data = {
            "name": "Volunteer Event 2024",
            "description": "Annual volunteer event for community service",
            "event_date": event_date.isoformat(),
            "location": "Community Center",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        response = supabase_client.client.table("events").insert(event_data).execute()
        if response.data:
            logger.info("Default event created successfully")
            return response.data[0]
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create default event"
        )
    except Exception as e:
        logger.error(f"Error creating default event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create default event"
        )
