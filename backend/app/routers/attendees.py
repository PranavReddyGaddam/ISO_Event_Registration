"""Attendee management API routes."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List
from datetime import datetime
import logging

from app.models.attendee import (
    AttendeeCreate,
    AttendeeResponse,
    CheckInRequest,
    CheckInResponse,
    AttendeeFilter,
    EventStats,
    ApiResponse,
    PaginatedResponse,
    PaginationMeta
)
from app.utils.supabase_client import supabase_client
from app.utils.qr_generator import qr_generator
from app.utils.email_provider import get_email_sender
from app.utils.auth import get_current_president, get_current_volunteer_or_president
from app.models.auth import TokenData

router = APIRouter(prefix="/api", tags=["attendees"])
logger = logging.getLogger(__name__)

@router.get("/volunteers/{volunteer_id}/attendees", response_model=PaginatedResponse[AttendeeResponse])
async def get_volunteer_attendees(
    volunteer_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: TokenData = Depends(get_current_president)
):
    """Get all attendees registered by a specific volunteer."""
    try:
        # Get attendees created by this volunteer
        attendees, total_count = await supabase_client.get_attendees_by_volunteer(
            volunteer_id=volunteer_id,
            limit=limit,
            offset=offset
        )
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
        current_page = (offset // limit) + 1
        has_next = offset + limit < total_count
        has_prev = offset > 0
        
        pagination_meta = PaginationMeta(
            total=total_count,
            limit=limit,
            offset=offset,
            total_pages=total_pages,
            current_page=current_page,
            has_next=has_next,
            has_prev=has_prev
        )
        
        return PaginatedResponse(
            data=[AttendeeResponse(**attendee) for attendee in attendees],
            pagination=pagination_meta
        )
        
    except Exception as e:
        logger.error(f"Error getting volunteer attendees: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve volunteer attendees"
        )

@router.get("/attendees/by-email/{email}", response_model=PaginatedResponse[AttendeeResponse])
async def get_attendees_by_email(
    email: str,
    limit: int = 50,
    offset: int = 0,
    current_user: TokenData = Depends(get_current_president)
):
    """Get all individual registrations for a specific email address."""
    try:
        # Get all attendees with this email
        attendees, total_count = await supabase_client.get_attendees_by_email(
            email=email,
            limit=limit,
            offset=offset
        )
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
        current_page = (offset // limit) + 1
        has_next = offset + limit < total_count
        has_prev = offset > 0
        
        pagination_meta = PaginationMeta(
            total=total_count,
            limit=limit,
            offset=offset,
            total_pages=total_pages,
            current_page=current_page,
            has_next=has_next,
            has_prev=has_prev
        )
        
        return PaginatedResponse(
            data=[AttendeeResponse(**attendee) for attendee in attendees],
            pagination=pagination_meta
        )
        
    except Exception as e:
        logger.error(f"Error getting attendees by email: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve attendee registrations"
        )

# Volunteers aggregation endpoint
@router.get("/volunteers/summary")
async def get_volunteer_summary(current_user: TokenData = Depends(get_current_president)):
    """Get all volunteers with their registration statistics."""
    try:
        # First, get all volunteer users (role = 'volunteer')
        volunteers_resp = supabase_client.service_client.table("users").select("id, full_name, email, team_role").eq("role", "volunteer").execute()
        volunteers = volunteers_resp.data or []
        
        # Then get attendees data for statistics
        attendees_resp = supabase_client.client.table("attendees").select("created_by, total_price, payment_mode").execute()
        attendees_data = attendees_resp.data or []
        
        # Create a map of volunteer statistics
        volunteer_stats = {}
        for attendee in attendees_data:
            vid = attendee.get("created_by")
            if vid and vid not in volunteer_stats:
                volunteer_stats[vid] = {
                    "total_attendees": 0,
                    "cash_count": 0,
                    "cash_amount": 0.0,
                    "zelle_count": 0,
                    "zelle_amount": 0.0,
                }
            
            if vid in volunteer_stats:
                volunteer_stats[vid]["total_attendees"] += 1
                if str(attendee.get("payment_mode", "")).lower() == "cash":
                    volunteer_stats[vid]["cash_count"] += 1
                    volunteer_stats[vid]["cash_amount"] += float(attendee.get("total_price", 0))
                elif str(attendee.get("payment_mode", "")).lower() == "zelle":
                    volunteer_stats[vid]["zelle_count"] += 1
                    volunteer_stats[vid]["zelle_amount"] += float(attendee.get("total_price", 0))
        
        # Combine volunteer info with their statistics
        result = []
        for volunteer in volunteers:
            vid = volunteer["id"]
            stats = volunteer_stats.get(vid, {
                "total_attendees": 0,
                "cash_count": 0,
                "cash_amount": 0.0,
                "zelle_count": 0,
                "zelle_amount": 0.0,
            })
            
            result.append({
                "volunteer_id": vid,
                "full_name": volunteer.get("full_name"),
                "email": volunteer.get("email"),
                "team_role": volunteer.get("team_role"),
                **stats
            })
        
        return result
    except Exception as e:
        logger.error(f"Error getting volunteer summary: {e}")
        raise HTTPException(status_code=500, detail="Failed to get volunteer summary")


async def send_registration_email_task(
    email: str,
    name: str,
    qr_code_url: str,
    qr_code_id: str,
    ticket_quantity: int,
    total_price: float
):
    """Background task to send registration email."""
    try:
        logger.info(f"Starting to send registration email to: {email}")
        sender = get_email_sender()
        result = await sender.send_registration_email(
            email, name, qr_code_url, qr_code_id, ticket_quantity, total_price
        )
        if result:
            logger.info(f"Registration email sent successfully to: {email}")
        else:
            logger.error(f"Registration email failed to send to: {email}")
    except Exception as e:
        logger.error(f"Failed to send registration email to {email}: {e}")
        logger.exception("Full traceback:")


async def send_registration_email_with_pdf_task(
    email: str,
    name: str,
    qr_codes_data: list,
    total_price: float
):
    """Background task to send registration email with PDF attachment."""
    try:
        logger.info(f"Starting to send registration email with PDF to: {email}")
        sender = get_email_sender()
        result = await sender.send_registration_email_with_pdf(
            email, name, qr_codes_data, total_price
        )
        if result:
            logger.info(f"Registration email with PDF sent successfully to: {email}")
        else:
            logger.error(f"Registration email with PDF failed to send to: {email}")
    except Exception as e:
        logger.error(f"Failed to send registration email with PDF to {email}: {e}")
        logger.exception("Full traceback:")





@router.post("/register", response_model=AttendeeResponse)
async def register_attendee(
    attendee: AttendeeCreate,
    background_tasks: BackgroundTasks,
    current_user: TokenData = Depends(get_current_volunteer_or_president)
):
    """Register a new attendee and generate QR code.
    
    Presidents have full access and can override duplicate checks.
    Volunteers have normal limitations and cannot register duplicates.
    """
    try:
        # Allow multiple registrations with the same email
        # No duplicate checking is performed - users can register multiple times with same email
        
        # Get default event ID (assuming single event for now)
        event_response = supabase_client.client.table("events").select("id").limit(1).execute()
        if not event_response.data:
            raise HTTPException(
                status_code=500,
                detail="No event found in database"
            )
        event_id = event_response.data[0]["id"]
        
        # Calculate ticket pricing using the pricing router logic
        try:
            # Get pricing tiers from database (filter by food option)
            pricing_response = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", event_id).eq("is_active", True).eq("food_option", attendee.food_option).order("quantity_from").execute()
            
            if not pricing_response.data:
                raise HTTPException(
                    status_code=400,
                    detail="No pricing tiers found for this event"
                )
            
            # Find the appropriate pricing tier based on food option and quantity
            price_per_ticket = None
            for tier_data in pricing_response.data:
                # Check if quantity is within range
                if (attendee.ticket_quantity >= tier_data["quantity_from"] and 
                    attendee.ticket_quantity <= tier_data["quantity_to"]):
                    
                    # Determine price based on food option
                    if "food_option" in tier_data:
                        if tier_data["food_option"] == attendee.food_option:
                            price_per_ticket = float(tier_data["price_per_ticket"])
                            break
                    else:
                        # No food_option column - use price mapping
                        # $15.00 = without_food, $18.00 = with_food
                        if attendee.food_option == "without_food" and float(tier_data["price_per_ticket"]) == 15.00:
                            price_per_ticket = 15.00
                            break
                        elif attendee.food_option == "with_food" and float(tier_data["price_per_ticket"]) == 18.00:
                            price_per_ticket = 18.00
                            break
            
            if price_per_ticket is None:
                raise HTTPException(
                    status_code=400,
                    detail="No pricing tier found for the specified quantity"
                )
            
            total_price = price_per_ticket * attendee.ticket_quantity
            
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to calculate ticket price: {str(e)}"
            )
        
        # Create multiple attendee records (one per ticket)
        created_attendees = []
        qr_codes_data = []  # Store QR code data for PDF generation
        
        for ticket_num in range(1, attendee.ticket_quantity + 1):
            # Generate unique QR code for each ticket
            qr_code_id = qr_generator.generate_qr_code_id()
            qr_code_id, qr_code_bytes = qr_generator.create_qr_code(
                qr_code_id, attendee.name
            )
            
            # Upload QR code to Supabase storage
            qr_code_url = await supabase_client.upload_qr_code(qr_code_id, qr_code_bytes)
            
            if not qr_code_url:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to upload QR code for ticket {ticket_num}"
                )
            
            # Calculate price per ticket
            price_per_ticket = total_price / attendee.ticket_quantity
            
            # Create attendee record for this ticket
            attendee_data = {
                "name": attendee.name,
                "email": attendee.email,
                "phone": attendee.phone,
                "payment_mode": attendee.payment_mode,
                "food_option": attendee.food_option,
                "ticket_quantity": 1,  # Each record represents 1 ticket
                "total_price": price_per_ticket,
                "event_id": event_id,
                "created_by": current_user.user_id if hasattr(current_user, 'user_id') else None,
                "qr_code_id": qr_code_id,
                "qr_code_url": qr_code_url,
                "created_at": datetime.utcnow().isoformat(),
                "is_checked_in": False
            }
            
            created_attendee = await supabase_client.create_attendee(attendee_data)
            created_attendees.append(created_attendee)
            
            # Store QR code data for PDF generation
            qr_codes_data.append({
                "qr_code_id": qr_code_id,
                "qr_code_url": qr_code_url,
                "ticket_number": ticket_num,
                "total_tickets": attendee.ticket_quantity,
                "attendee_name": attendee.name,
                "attendee_email": attendee.email,
                "attendee_phone": attendee.phone,
                "price_per_ticket": price_per_ticket
            })
        
        # Send registration email with PDF attachment
        try:
            await send_registration_email_with_pdf_task(
                attendee.email,
                attendee.name,
                qr_codes_data,
                total_price
            )
        except Exception as e:
            logger.error(f"Email sending failed but registration succeeded: {e}")
        
        # Return the first attendee record (for API compatibility)
        return AttendeeResponse(**created_attendees[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error registering attendee: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to register attendee"
        )


@router.get("/attendee/{qr_id}", response_model=AttendeeResponse)
async def get_attendee_by_qr(qr_id: str):
    """Get attendee information by QR code ID."""
    try:
        attendee = await supabase_client.get_attendee_by_qr_id(qr_id)
        
        if not attendee:
            raise HTTPException(
                status_code=404,
                detail="Attendee not found"
            )
        
        return AttendeeResponse(**attendee)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting attendee: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve attendee"
        )


@router.post("/checkin/{qr_id}", response_model=CheckInResponse)
async def checkin_attendee(
    qr_id: str,
    background_tasks: BackgroundTasks
):
    """Check in an attendee using their QR code ID."""
    try:
        # First, get the attendee
        attendee = await supabase_client.get_attendee_by_qr_id(qr_id)
        
        if not attendee:
            raise HTTPException(
                status_code=404,
                detail="Attendee not found"
            )
        
        # Check if already checked in
        if attendee.get("is_checked_in", False):
            return CheckInResponse(
                success=False,
                attendee=AttendeeResponse(**attendee),
                message="Attendee already checked in"
            )
        
        # Update check-in status
        updated_attendee = await supabase_client.update_attendee_checkin(qr_id)
        
        if not updated_attendee:
            raise HTTPException(
                status_code=500,
                detail="Failed to check in attendee"
            )
        
        # Send check-in confirmation email in background
        sender = get_email_sender()
        background_tasks.add_task(
            sender.send_checkin_confirmation,
            updated_attendee["email"],
            updated_attendee["name"]
        )
        
        return CheckInResponse(
            success=True,
            attendee=AttendeeResponse(**updated_attendee),
            message="Check-in successful"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking in attendee: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to check in attendee"
        )


@router.get("/attendees", response_model=PaginatedResponse[AttendeeResponse])
async def get_attendees(
    checked_in: bool = None,
    search: str = None,
    food_option: str = None,
    limit: int = 50,
    offset: int = 0,
    current_user: TokenData = Depends(get_current_president)
):
    """Get list of attendees with optional filters and pagination."""
    try:
        attendees, total_count = await supabase_client.get_attendees(
            checked_in=checked_in,
            search=search,
            food_option=food_option,
            limit=limit,
            offset=offset
        )
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 1
        current_page = (offset // limit) + 1
        has_next = offset + limit < total_count
        has_prev = offset > 0
        
        pagination_meta = PaginationMeta(
            total=total_count,
            limit=limit,
            offset=offset,
            total_pages=total_pages,
            current_page=current_page,
            has_next=has_next,
            has_prev=has_prev
        )
        
        return PaginatedResponse(
            data=[AttendeeResponse(**attendee) for attendee in attendees],
            pagination=pagination_meta
        )
        
    except Exception as e:
        logger.error(f"Error getting attendees: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve attendees"
        )




@router.get("/stats", response_model=EventStats)
async def get_event_stats(current_user: TokenData = Depends(get_current_president)):
    """Get event statistics."""
    try:
        stats = await supabase_client.get_event_stats()
        
        # Convert recent check-ins to AttendeeResponse objects
        recent_checkins = [
            AttendeeResponse(**attendee) 
            for attendee in stats["recent_checkins"]
        ]
        
        return EventStats(
            total_registered=stats["total_registered"],
            total_checked_in=stats["total_checked_in"],
            checked_in_percentage=stats["checked_in_percentage"],
            total_tickets_sold=stats.get("total_tickets_sold", 0),
            total_revenue=stats.get("total_revenue", 0.0),
            revenue_cash=stats.get("revenue_cash", 0.0),
            revenue_zelle=stats.get("revenue_zelle", 0.0),
            recent_checkins=recent_checkins
        )
        
    except Exception as e:
        logger.error(f"Error getting event stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve event statistics"
        )
