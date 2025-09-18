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
from app.utils.auth import (
    get_current_president, 
    get_current_volunteer_or_president,
    get_current_president_or_finance_director,
    get_current_dashboard_user
)
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

def filter_volunteer_summary_by_role(volunteers: list, user_role: str) -> list:
    """Filter volunteer summary data based on user role."""
    # President and Finance Director see all data
    return volunteers


# Volunteers aggregation endpoint
@router.get("/volunteers/summary")
async def get_volunteer_summary(current_user: TokenData = Depends(get_current_president_or_finance_director)):
    """Get all volunteers with their registration statistics."""
    try:
        # First, get all sales team users (volunteers, president, finance director)
        volunteers_resp = (
            supabase_client.service_client
            .table("users")
            .select("id, full_name, email, team_role, role, cleared_amount")
            .in_("role", ["volunteer", "president", "finance_director"])
            .execute()
        )
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
            
            # Calculate total amount collected and pending amount
            total_collected = stats["cash_amount"] + stats["zelle_amount"]
            cleared_amount = float(volunteer.get("cleared_amount", 0.0))
            pending_amount = total_collected - cleared_amount
            
            result.append({
                "volunteer_id": vid,
                "full_name": volunteer.get("full_name"),
                "email": volunteer.get("email"),
                "team_role": (
                    volunteer.get("team_role")
                    if volunteer.get("role") == "volunteer"
                    else ("President" if volunteer.get("role") == "president" else "Finance Director")
                ),
                "user_role": volunteer.get("role"),
                "cleared_amount": cleared_amount,
                "total_collected": total_collected,
                "pending_amount": pending_amount,
                **stats
            })
        
        # Apply role-based filtering
        filtered_result = filter_volunteer_summary_by_role(result, current_user.role)
        return filtered_result
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
        
        # Prepare all QR codes and data first (before any database operations)
        qr_codes_data = []  # Store QR code data for PDF generation
        attendee_records = []  # Store all attendee data before database insertion
        
        logger.info(f"Preparing {attendee.ticket_quantity} tickets for {attendee.name}")
        
        # Step 1: Generate all QR codes and prepare all data
        for ticket_num in range(1, attendee.ticket_quantity + 1):
            try:
                # Generate unique QR code for each ticket
                qr_code_id = qr_generator.generate_qr_code_id()
                qr_code_id, qr_code_bytes = qr_generator.create_qr_code(
                    qr_code_id, attendee.name
                )
                
                # Upload QR code to Supabase storage
                qr_code_url = await supabase_client.upload_qr_code(qr_code_id, qr_code_bytes)
                
                if not qr_code_url:
                    raise Exception(f"Failed to upload QR code for ticket {ticket_num}")
                
                # Calculate price per ticket
                price_per_ticket = total_price / attendee.ticket_quantity
                
                # Prepare attendee record for this ticket
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
                
                attendee_records.append(attendee_data)
                
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
                
                logger.info(f"Successfully prepared ticket {ticket_num}/{attendee.ticket_quantity}")
                
            except Exception as e:
                logger.error(f"Failed to prepare ticket {ticket_num}: {e}")
                # Clean up any QR codes that were uploaded but registration failed
                for cleanup_data in qr_codes_data:
                    try:
                        await supabase_client.delete_qr_code(cleanup_data["qr_code_id"])
                        logger.info(f"Cleaned up QR code: {cleanup_data['qr_code_id']}")
                    except Exception as cleanup_error:
                        logger.error(f"Failed to cleanup QR code {cleanup_data['qr_code_id']}: {cleanup_error}")
                
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to prepare ticket {ticket_num} of {attendee.ticket_quantity}. Please try again."
                )
        
        # Step 2: Create all attendee records in database (all or nothing)
        created_attendees = []
        try:
            for i, attendee_data in enumerate(attendee_records):
                created_attendee = await supabase_client.create_attendee(attendee_data)
                created_attendees.append(created_attendee)
                logger.info(f"Created attendee record {i+1}/{len(attendee_records)}")
                
        except Exception as e:
            logger.error(f"Failed to create attendee records: {e}")
            # Rollback: Delete all created attendees
            for i, created_attendee in enumerate(created_attendees):
                try:
                    await supabase_client.delete_attendee(created_attendee["id"])
                    logger.info(f"Rolled back attendee record {i+1}")
                except Exception as rollback_error:
                    logger.error(f"Failed to rollback attendee {created_attendee.get('id', 'unknown')}: {rollback_error}")
            
            # Clean up QR codes
            for cleanup_data in qr_codes_data:
                try:
                    await supabase_client.delete_qr_code(cleanup_data["qr_code_id"])
                    logger.info(f"Cleaned up QR code: {cleanup_data['qr_code_id']}")
                except Exception as cleanup_error:
                    logger.error(f"Failed to cleanup QR code {cleanup_data['qr_code_id']}: {cleanup_error}")
            
            raise HTTPException(
                status_code=500,
                detail="Failed to create registration records. Please try again."
            )
        
        # Step 3: Send registration email with PDF attachment (only if all tickets created successfully)
        try:
            logger.info(f"Sending registration email to {attendee.email} for {len(qr_codes_data)} tickets")
            await send_registration_email_with_pdf_task(
                attendee.email,
                attendee.name,
                qr_codes_data,
                total_price
            )
            logger.info(f"Successfully sent registration email to {attendee.email}")
        except Exception as e:
            logger.error(f"Email sending failed for {attendee.email}: {e}")
            # Note: We don't rollback the registration if email fails
            # The tickets are valid even if email delivery fails
        
        # Return a summary record with total registration information
        first_attendee = created_attendees[0]
        summary_data = {
            **first_attendee,
            "ticket_quantity": attendee.ticket_quantity,  # Total tickets purchased
            "total_price": total_price,  # Total price for all tickets
            "qr_code_id": "",  # Empty for security - not displayed on confirmation screen
            "qr_code_url": None  # No single QR code URL for multiple tickets
        }
        return AttendeeResponse(**summary_data)
        
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
    current_user: TokenData = Depends(get_current_dashboard_user)
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




def filter_stats_by_role(stats: dict, user_role: str) -> dict:
    """Filter event stats based on user role."""
    # President and Finance Director see all data
    return stats


@router.get("/volunteers/leaderboard")
async def get_volunteer_leaderboard(current_user: TokenData = Depends(get_current_volunteer_or_president)):
    """Get volunteer leaderboard with top 3 performers and current user's rank."""
    try:
        # Get all volunteers (exclude leadership roles)
        volunteers_resp = (
            supabase_client.service_client
            .table("users")
            .select("id, full_name, team_role")
            .eq("role", "volunteer")
            .not_.is_("team_role", "null")
            .not_.in_("team_role", ["Director", "Secretary", "Vice President", "President"])
            .execute()
        )
        volunteers = volunteers_resp.data or []
        
        # Also get current user info to ensure they're included
        current_user_resp = (
            supabase_client.service_client
            .table("users")
            .select("id, full_name, team_role, role")
            .eq("id", current_user.user_id)
            .execute()
        )
        current_user_data = current_user_resp.data[0] if current_user_resp.data else None
        
        # Debug current user data
        logger.info(f"Current user data from DB: {current_user_data}")
        
        # Add current user to volunteers list if they're not already there and are eligible
        if current_user_data and current_user_data not in volunteers:
            # Check if current user is eligible (not a leadership role)
            if (current_user_data.get("team_role") and 
                current_user_data.get("team_role") not in ["Director", "Secretary", "Vice President", "President"]):
                volunteers.append(current_user_data)
                logger.info(f"Added current user to volunteers list: {current_user_data['full_name']}")
            else:
                logger.info(f"Current user not eligible for leaderboard - Role: {current_user_data.get('role')}, Team Role: {current_user_data.get('team_role')}")
        
        # If current user is still not in the list, add them anyway for display purposes
        if current_user_data and not any(v["id"] == current_user.user_id for v in volunteers):
            logger.info("Adding current user to leaderboard for display purposes")
            volunteers.append(current_user_data)
        
        if not volunteers:
            return {
                "top_volunteers": [],
                "current_user_rank": None,
                "total_volunteers": 0
            }
        
        # Get ticket counts for each volunteer
        volunteer_ids = [v["id"] for v in volunteers]
        attendees_resp = supabase_client.client.table("attendees").select("created_by, ticket_quantity").in_("created_by", volunteer_ids).execute()
        attendees_data = attendees_resp.data or []
        
        # Count tickets per volunteer
        volunteer_tickets = {}
        for attendee in attendees_data:
            vid = attendee.get("created_by")
            if vid:
                volunteer_tickets[vid] = volunteer_tickets.get(vid, 0) + attendee.get("ticket_quantity", 1)
        
        # Create leaderboard data
        leaderboard_data = []
        for volunteer in volunteers:
            vid = volunteer["id"]
            tickets_sold = volunteer_tickets.get(vid, 0)
            leaderboard_data.append({
                "volunteer_id": vid,
                "full_name": volunteer.get("full_name"),
                "team_role": volunteer.get("team_role"),
                "tickets_sold": tickets_sold,
                "is_current_user": vid == current_user.user_id
            })
        
        # Sort by tickets sold (descending)
        leaderboard_data.sort(key=lambda x: x["tickets_sold"], reverse=True)
        
        # Assign ranks (handle ties)
        current_rank = 1
        for i, volunteer in enumerate(leaderboard_data):
            if i > 0 and volunteer["tickets_sold"] != leaderboard_data[i-1]["tickets_sold"]:
                current_rank = i + 1
            volunteer["rank"] = current_rank
        
        # Get top 3
        top_volunteers = leaderboard_data[:3]
        
        # Find current user's rank
        current_user_rank = None
        for volunteer in leaderboard_data:
            if volunteer["is_current_user"]:
                current_user_rank = volunteer
                break
        
        # Debug logging
        logger.info(f"Current user ID: {current_user.user_id}")
        logger.info(f"Current user role: {current_user.role}")
        logger.info(f"Total volunteers in leaderboard: {len(leaderboard_data)}")
        logger.info(f"Current user found: {current_user_rank is not None}")
        
        # Additional debugging
        if current_user_rank is None:
            logger.info("Current user not found in leaderboard. Checking all volunteers...")
            for volunteer in leaderboard_data:
                logger.info(f"  Volunteer ID: {volunteer['volunteer_id']}, Name: {volunteer['full_name']}, Is Current User: {volunteer['is_current_user']}")
        else:
            logger.info(f"Current user rank: {current_user_rank['rank']}, Tickets: {current_user_rank['tickets_sold']}")
        
        return {
            "top_volunteers": top_volunteers,
            "current_user_rank": current_user_rank,
            "total_volunteers": len(leaderboard_data)
        }
        
    except Exception as e:
        logger.error(f"Error getting volunteer leaderboard: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve volunteer leaderboard"
        )


@router.get("/stats", response_model=EventStats)
async def get_event_stats(current_user: TokenData = Depends(get_current_dashboard_user)):
    """Get event statistics."""
    try:
        stats = await supabase_client.get_event_stats()
        
        # Filter stats based on user role
        filtered_stats = filter_stats_by_role(stats, current_user.role)
        
        # Convert recent check-ins to AttendeeResponse objects
        recent_checkins = [
            AttendeeResponse(**attendee) 
            for attendee in filtered_stats["recent_checkins"]
        ]
        
        return EventStats(
            total_registered=filtered_stats["total_registered"],
            total_checked_in=filtered_stats["total_checked_in"],
            checked_in_percentage=filtered_stats["checked_in_percentage"],
            total_tickets_sold=filtered_stats["total_tickets_sold"],
            total_revenue=filtered_stats["total_revenue"],
            revenue_cash=filtered_stats["revenue_cash"],
            revenue_zelle=filtered_stats["revenue_zelle"],
            recent_checkins=recent_checkins
        )
        
    except Exception as e:
        logger.error(f"Error getting event stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve event statistics"
        )
