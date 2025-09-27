"""Attendee management API routes."""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Query, UploadFile, File, Form
from fastapi.responses import Response
from typing import List, Optional
from datetime import datetime
import logging
import csv
import io
import uuid
from pydantic import BaseModel, EmailStr
from fastapi import status

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
    get_current_dashboard_user,
    get_current_leaderboard_user,
    get_current_volunteer_president_or_finance_director
)
from app.models.auth import TokenData

router = APIRouter(prefix="/api", tags=["attendees"])
logger = logging.getLogger(__name__)

@router.get("/volunteers/{volunteer_id}/details")
async def get_volunteer_details(
    volunteer_id: str,
    current_user: TokenData = Depends(get_current_president_or_finance_director)
):
    """Get volunteer details with financial summary."""
    try:
        # Get volunteer info
        volunteer = await supabase_client.get_user_by_id(volunteer_id)
        if not volunteer:
            raise HTTPException(
                status_code=404,
                detail="Volunteer not found"
            )
        
        # Get all attendees created by this volunteer (for financial calculation)
        all_attendees, _ = await supabase_client.get_attendees_by_volunteer(
            volunteer_id=volunteer_id,
            limit=10000,  # Get all attendees for accurate financial calculation
            offset=0
        )
        
        # Calculate financial summary
        total_sales = sum(float(attendee.get("total_price", 0) or 0) for attendee in all_attendees)
        cleared_amount = float(volunteer.get("cleared_amount", 0.0) or 0.0)
        pending_amount = total_sales - cleared_amount
        
        # Calculate payment breakdown
        cash_amount = 0.0
        zelle_amount = 0.0
        cash_count = 0
        zelle_count = 0
        
        for attendee in all_attendees:
            payment_mode = str(attendee.get("payment_mode", "")).lower()
            amount = float(attendee.get("total_price", 0) or 0)
            
            if payment_mode == "cash":
                cash_amount += amount
                cash_count += 1
            elif payment_mode == "zelle":
                zelle_amount += amount
                zelle_count += 1
        
        return {
            "volunteer_id": volunteer_id,
            "full_name": volunteer.get("full_name"),
            "email": volunteer.get("email"),
            "team_role": volunteer.get("team_role"),
            "total_attendees": len(all_attendees),
            "total_sales": total_sales,
            "cleared_amount": cleared_amount,
            "pending_amount": pending_amount,
            "cash_count": cash_count,
            "cash_amount": cash_amount,
            "zelle_count": zelle_count,
            "zelle_amount": zelle_amount,
            "status": "Fully Cleared" if pending_amount == 0 else "Partially Cleared" if cleared_amount > 0 else "Not Cleared"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting volunteer details: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve volunteer details"
        )


@router.get("/volunteers/{volunteer_id}/attendees", response_model=PaginatedResponse[AttendeeResponse])
async def get_volunteer_attendees(
    volunteer_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user: TokenData = Depends(get_current_president_or_finance_director)
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
    current_user: TokenData = Depends(get_current_president_or_finance_director)
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


@router.get("/volunteers/summary/csv")
async def download_volunteer_summary_csv(current_user: TokenData = Depends(get_current_president_or_finance_director)):
    """Download volunteer summary data as CSV file."""
    try:
        # Get the same data as the volunteer summary endpoint
        volunteers_resp = (
            supabase_client.service_client
            .table("users")
            .select("id, full_name, email, team_role, role, cleared_amount")
            .in_("role", ["volunteer", "president", "finance_director"])
            .execute()
        )
        volunteers = volunteers_resp.data or []
        
        # Get attendees data for statistics
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
        
        # Prepare CSV data
        csv_data = []
        for volunteer in volunteers:
            vid = volunteer["id"]
            stats = volunteer_stats.get(vid, {
                "total_attendees": 0,
                "cash_count": 0,
                "cash_amount": 0.0,
                "zelle_count": 0,
                "zelle_amount": 0.0,
            })
            
            # Calculate totals
            total_collected = stats["cash_amount"] + stats["zelle_amount"]
            cleared_amount = float(volunteer.get("cleared_amount", 0.0))
            pending_amount = total_collected - cleared_amount
            
            # Determine team role display
            team_role = (
                volunteer.get("team_role")
                if volunteer.get("role") == "volunteer"
                else ("President" if volunteer.get("role") == "president" else "Finance Director")
            )
            
            csv_data.append({
                "Full Name": volunteer.get("full_name", ""),
                "Email": volunteer.get("email", ""),
                "Team Role": team_role,
                "Total Tickets Sold": stats["total_attendees"],
                "Cash Count": stats["cash_count"],
                "Cash Amount": f"${stats['cash_amount']:.2f}",
                "Zelle Count": stats["zelle_count"],
                "Zelle Amount": f"${stats['zelle_amount']:.2f}",
                "Total Collected": f"${total_collected:.2f}",
                "Cleared Amount": f"${cleared_amount:.2f}",
                "Pending Amount": f"${pending_amount:.2f}",
                "Status": "Cleared" if pending_amount == 0 else "Pending" if cleared_amount == 0 else "Partially Cleared"
            })
        
        # Create CSV content
        output = io.StringIO()
        if csv_data:
            fieldnames = csv_data[0].keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_data)
        
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Volunteer_Data_{timestamp}.csv"
        
        # Return CSV file as response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error generating volunteer summary CSV: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate CSV file")


@router.get("/attendees/csv")
async def download_attendees_csv(
    search: str = Query(""),
    checked_in: Optional[bool] = Query(None),
    limit: int = Query(1000, le=10000),  # Allow up to 10,000 records
    offset: int = Query(0, ge=0),
    current_user: TokenData = Depends(get_current_president_or_finance_director)
):
    """Download attendees data as CSV file."""
    try:
        # Build filter parameters
        filter_params = {
            "search": search,
            "limit": limit,
            "offset": offset
        }
        
        if checked_in is not None:
            filter_params["checked_in"] = checked_in
        
        # Get attendees data using the same logic as the regular endpoint
        attendees_resp = supabase_client.client.table("attendees").select(
            "id, name, email, phone, ticket_quantity, total_price, payment_mode, "
            "created_at, checked_in_at, created_by, qr_code_id, is_checked_in"
        )
        
        # Apply filters
        if search:
            attendees_resp = attendees_resp.or_(
                f"name.ilike.%{search}%,email.ilike.%{search}%,phone.ilike.%{search}%"
            )
        
        if checked_in is not None:
            if checked_in:
                attendees_resp = attendees_resp.not_.is_("checked_in_at", "null")
            else:
                attendees_resp = attendees_resp.is_("checked_in_at", "null")
        
        # Apply pagination
        attendees_resp = attendees_resp.range(offset, offset + limit - 1)
        
        # Execute query
        response = attendees_resp.execute()
        attendees_data = response.data or []
        
        # Get user data for created_by mapping
        user_ids = list(set(attendee.get("created_by") for attendee in attendees_data if attendee.get("created_by")))
        users_data = {}
        if user_ids:
            users_resp = supabase_client.service_client.table("users").select("id, full_name, email").in_("id", user_ids).execute()
            users_data = {user["id"]: user for user in users_resp.data or []}
        
        # Prepare CSV data
        csv_data = []
        for attendee in attendees_data:
            created_by_user = users_data.get(attendee.get("created_by"), {})
            
            csv_data.append({
                "Full Name": attendee.get("name", ""),
                "Email": attendee.get("email", ""),
                "Phone": attendee.get("phone", ""),
                "Ticket Quantity": attendee.get("ticket_quantity", 0),
                "Total Price": f"${attendee.get('total_price', 0):.2f}",
                "Payment Mode": attendee.get("payment_mode", ""),
                "Registration Date": datetime.fromisoformat(attendee.get("created_at", "")).strftime("%Y-%m-%d %H:%M:%S") if attendee.get("created_at") else "",
                "Checked In": "Yes" if attendee.get("checked_in_at") else "No",
                "Check-in Date": datetime.fromisoformat(attendee.get("checked_in_at", "")).strftime("%Y-%m-%d %H:%M:%S") if attendee.get("checked_in_at") else "",
                "Registered By": created_by_user.get("full_name", ""),
                "QR Code ID": attendee.get("qr_code_id", "")
            })
        
        # Create CSV content
        output = io.StringIO()
        if csv_data:
            fieldnames = csv_data[0].keys()
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_data)
        
        csv_content = output.getvalue()
        output.close()
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"Attendees_Data_{timestamp}.csv"
        
        # Return CSV file as response
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error generating attendees CSV: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate CSV file")


class ResendQrEmailRequest(BaseModel):
    """Model for resending QR email request."""
    email: EmailStr


@router.post("/attendees/resend-qr-email")
async def resend_qr_email(
    request: ResendQrEmailRequest,
    current_user: TokenData = Depends(get_current_president_or_finance_director)
):
    """Resend QR code emails for all registrations under a specific email."""
    try:
        # Get all attendees for the email
        attendees = await supabase_client.get_attendees_with_qr_codes_by_email(request.email)
        
        if not attendees:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registrations found for this email address"
            )
        
        # Check if any attendees have QR codes
        attendees_with_qr = [a for a in attendees if a.get("qr_code_id")]
        if not attendees_with_qr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR codes have not been generated for these registrations yet"
            )
        
        # Get email sender
        from app.utils.email_provider import get_email_sender
        email_sender = get_email_sender()
        
        # Generate email content using the same logic as original registration
        attendee_name = attendees_with_qr[0].get("name", "Valued Attendee")
        total_registrations = len(attendees_with_qr)
        total_price = sum(attendee.get("total_price", 0) for attendee in attendees_with_qr)
        
        # Prepare QR codes data for PDF generation (same format as original registration)
        qr_codes_data = []
        for i, attendee in enumerate(attendees_with_qr, 1):
            qr_codes_data.append({
                "qr_code_id": attendee.get("qr_code_id", ""),
                "qr_code_url": attendee.get("qr_code_url", ""),
                "ticket_number": i,  # Sequential ticket number for this resend
                "total_tickets": len(attendees_with_qr),  # Total tickets being resent
                "attendee_name": attendee.get("name", ""),
                "attendee_email": attendee.get("email", ""),
                "attendee_phone": attendee.get("phone", ""),
                "price_per_ticket": attendee.get("total_price", 0)  # Each attendee record represents 1 ticket
            })
        
        # Send resend email with PDF attachment
        await send_resend_email_with_pdf_task(
            request.email,
            attendee_name,
            qr_codes_data,
            total_price
        )
        
        return {
            "message": f"QR code emails successfully resent to {request.email} for {total_registrations} registration{'s' if total_registrations > 1 else ''}",
            "email": request.email,
            "registrations_count": total_registrations
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending QR email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend QR code email"
        )


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


async def send_resend_email_with_pdf_task(
    email: str,
    name: str,
    qr_codes_data: list,
    total_price: float
):
    """Background task to send resend email with PDF attachment."""
    try:
        logger.info(f"Starting to send resend email with PDF to: {email}")
        sender = get_email_sender()
        
        # Get event details for email content
        event_details = await sender.get_current_event_details()
        
        # Generate PDF
        from app.utils.pdf_generator import pdf_generator
        pdf_bytes = pdf_generator.generate_qr_tickets_pdf(qr_codes_data, event_details['name'])
        
        # Create resend-specific email content
        subject = f"Your {event_details['name']} Tickets - QR Codes (Resent)"
        ticket_count = len(qr_codes_data)
        
        # Create resend-specific HTML content
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background-color: #f3f4f6;">
            <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1f2937; margin: 0 0 10px 0;">{event_details['name']}</h1>
                    <p style="color: #6b7280; margin: 0;">Your QR Code Tickets (Resent)</p>
                </div>
                
                <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px;">
                    <p style="margin: 0; color: #1e40af;">
                        <strong>Hello {name},</strong><br>
                        We've resent your QR code tickets for your convenience. Your tickets are attached to this email as a PDF file.
                    </p>
                </div>
                
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="color: #374151; margin: 0 0 15px 0;">Ticket Summary</h3>
                    <p><strong>Total Tickets:</strong> {ticket_count}</p>
                    <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                </div>
                
                <div class="pdf-box" style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0;">📄 Your QR Code Tickets</h3>
                    <p style="color: #92400e; margin: 0;">Your QR code tickets have been attached to this email as a PDF file.</p>
                    <p style="color: #92400e; margin: 5px 0 0 0;">Each ticket contains a unique QR code that will be scanned at check-in.</p>
                </div>
                
                <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="color: #374151; margin: 0 0 15px 0;">Check-in Instructions</h3>
                    <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                        <li>Present your QR code at the event entrance</li>
                        <li>Each QR code is valid for the number of tickets purchased</li>
                        <li>Keep your phone charged and ready</li>
                        <li>Contact us if you have any issues</li>
                    </ul>
                </div>
                
                <div style="text-align: center; color: #6b7280; font-size: 14px;">
                    <p>If you have any questions, please contact us.</p>
                    <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        This email was resent by an event administrator.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email with PDF attachment
        result = await sender._send_email_with_pdf(
            email, subject, html_content, pdf_bytes, f"{name}_tickets_resent.pdf"
        )
        
        if result:
            logger.info(f"Resend email with PDF sent successfully to: {email}")
        else:
            logger.error(f"Resend email with PDF failed to send to: {email}")
            
    except Exception as e:
        logger.error(f"Failed to send resend email with PDF to {email}: {e}")
        logger.exception("Full traceback:")





@router.post("/register", response_model=AttendeeResponse)
async def register_attendee(
    attendee: AttendeeCreate,
    background_tasks: BackgroundTasks,
    current_user: TokenData = Depends(get_current_volunteer_president_or_finance_director)
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
                            base_price = float(tier_data["price_per_ticket"])
                            
                            # Add $1 for Zelle payments
                            if attendee.payment_mode == "zelle":
                                price_per_ticket = base_price + 1.00
                            else:
                                price_per_ticket = base_price
                            break
                    else:
                        # No food_option column - use price mapping
                        # $15.00 = without_food, $18.00 = with_food
                        if attendee.food_option == "without_food" and float(tier_data["price_per_ticket"]) == 15.00:
                            base_price = 15.00
                        elif attendee.food_option == "with_food" and float(tier_data["price_per_ticket"]) == 18.00:
                            base_price = 18.00
                        else:
                            continue
                        
                        # Add $1 for Zelle payments
                        if attendee.payment_mode == "zelle":
                            price_per_ticket = base_price + 1.00
                        else:
                            price_per_ticket = base_price
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
                    "email": attendee.email.lower().strip(),  # Normalize email to lowercase
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
    sort_by: str = None,
    sort_dir: str = "desc",
    current_user: TokenData = Depends(get_current_dashboard_user)
):
    """Get list of attendees with optional filters and pagination."""
    try:
        attendees, total_count = await supabase_client.get_attendees(
            checked_in=checked_in,
            search=search,
            food_option=food_option,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_dir=sort_dir
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
async def get_volunteer_leaderboard(current_user: TokenData = Depends(get_current_leaderboard_user)):
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


@router.post("/upload-transaction-screenshot")
async def upload_transaction_screenshot(
    file: UploadFile = File(...),
    attendee_id: str = Form(None),
    current_user: TokenData = Depends(get_current_volunteer_or_president)
):
    """Upload transaction screenshot for Zelle payment verification."""
    try:
        # Validate attendee_id is provided
        if not attendee_id:
            raise HTTPException(
                status_code=400,
                detail="Attendee ID is required for transaction screenshot upload"
            )
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only image files (JPEG, PNG, GIF, WebP) are allowed."
            )
        
        # Validate file size (2MB limit)
        file_content = await file.read()
        if len(file_content) > 2 * 1024 * 1024:  # 2MB
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size is 2MB."
            )
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"transaction_{uuid.uuid4()}.{file_extension}"
        file_path = f"screenshots/{unique_filename}"
        
        # Upload to Supabase storage
        upload_response = supabase_client.service_client.storage.from_("transaction-screenshots").upload(
            file_path,
            file_content,
            {"content-type": file.content_type}
        )
        
        if not upload_response:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to storage"
            )
        
        # Get signed URL for private bucket (valid for 1 hour)
        signed_url_response = supabase_client.service_client.storage.from_("transaction-screenshots").create_signed_url(file_path, 3600)
        public_url = signed_url_response.get('signedURL') if isinstance(signed_url_response, dict) else signed_url_response
        
        # Update the attendee record with the screenshot URL
        update_response = supabase_client.client.table("attendees").update({
            "transaction_screenshot_url": public_url
        }).eq("id", attendee_id).execute()
        
        if not update_response.data:
            raise HTTPException(
                status_code=404,
                detail="Attendee not found"
            )
        
        return {
            "success": True,
            "message": "Transaction screenshot uploaded successfully",
            "file_url": public_url,
            "attendee_id": attendee_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading transaction screenshot: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to upload transaction screenshot"
        )


@router.get("/transaction-screenshots")
async def get_transaction_screenshots(
    current_user: TokenData = Depends(get_current_dashboard_user)
):
    """Get all transaction screenshots for admin review (President and Finance Director only)."""
    try:
        # Get all attendees with transaction screenshots
        # Fetch attendees using anon client; avoid cross-table join due to RLS on users
        response = supabase_client.client.table("attendees").select(
            "id, name, email, phone, ticket_quantity, total_price, payment_mode, "
            "transaction_screenshot_url, created_at, created_by"
        ).not_.is_("transaction_screenshot_url", "null").order("created_at", desc=True).execute()
        
        if not response.data:
            return []
        
        # Build user lookup using service client (bypasses RLS)
        user_map = {}
        try:
            user_ids = list({a.get("created_by") for a in (response.data or []) if a.get("created_by")})
            if user_ids:
                users_resp = supabase_client.service_client.table("users").select("id, full_name, email, role").in_("id", user_ids).execute()
                user_map = {u["id"]: u for u in (users_resp.data or [])}
        except Exception as e:
            logger.warning(f"Failed to fetch user info for screenshots: {e}")

        # Format the response
        screenshots = []
        for attendee in response.data:
            if not attendee:
                continue
                
            volunteer_info = user_map.get(attendee.get("created_by"), {})
            screenshots.append({
                "attendee_id": attendee.get("id"),
                "attendee_name": attendee.get("name"),
                "attendee_email": attendee.get("email"),
                "attendee_phone": attendee.get("phone"),
                "ticket_quantity": attendee.get("ticket_quantity"),
                "total_price": attendee.get("total_price"),
                "payment_mode": attendee.get("payment_mode"),
                "transaction_screenshot_url": attendee.get("transaction_screenshot_url"),
                "created_at": attendee.get("created_at"),
                # Who sold/registered
                "created_by": attendee.get("created_by"),
                "volunteer_name": volunteer_info.get("full_name") if volunteer_info else None,
                "volunteer_email": volunteer_info.get("email") if volunteer_info else None,
                "volunteer_role": volunteer_info.get("role") if volunteer_info else None
            })
        
        # Refresh signed URLs for each screenshot (since they expire)
        for screenshot in screenshots:
            if screenshot.get("transaction_screenshot_url"):
                try:
                    # Extract file path from the stored URL
                    stored_url = screenshot["transaction_screenshot_url"]
                    if "screenshots/" in stored_url:
                        # Extract the file path from the URL
                        file_path = stored_url.split("screenshots/")[-1].split("?")[0]
                        file_path = f"screenshots/{file_path}"
                        
                        # Generate new signed URL
                        signed_url_response = supabase_client.service_client.storage.from_("transaction-screenshots").create_signed_url(file_path, 3600)
                        new_url = signed_url_response.get('signedURL') if isinstance(signed_url_response, dict) else signed_url_response
                        
                        if new_url:
                            screenshot["transaction_screenshot_url"] = new_url
                except Exception as e:
                    logger.warning(f"Failed to refresh signed URL for screenshot: {e}")
                    # Keep the old URL if refresh fails
        
        return screenshots
        
    except Exception as e:
        logger.error(f"Error getting transaction screenshots: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve transaction screenshots"
        )
