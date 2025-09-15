from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
import logging
from datetime import datetime

from app.models.volunteer_application import (
    VolunteerApplicationCreate,
    VolunteerApplicationResponse,
    VolunteerApplicationUpdate,
    VolunteerApplicationApproval,
    VolunteerApplicationRejection,
    ApplicationStatus
)
from app.models.auth import TokenData
from app.utils.supabase_client import supabase_client
from app.utils.auth import get_current_president
from app.utils.gmail_email_sender import gmail_email_sender

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/volunteer-applications", tags=["volunteer-applications"])


@router.post("/signup", response_model=VolunteerApplicationResponse)
async def create_volunteer_application(application: VolunteerApplicationCreate):
    """Create a new volunteer application."""
    try:
        # Check if email already exists in applications or users
        # Use service client to bypass RLS during server-side validation
        existing_application = supabase_client.service_client.table("volunteer_applications").select("*").eq("email", application.email).execute()
        if existing_application.data:
            raise HTTPException(
                status_code=409,
                detail="An application with this email already exists"
            )
        
        # Check if email already exists in users table
        existing_user = supabase_client.service_client.table("users").select("*").eq("email", application.email).execute()
        if existing_user.data:
            raise HTTPException(
                status_code=409,
                detail="A user with this email already exists"
            )
        
        # Create the application
        application_data = {
            "name": application.name,
            "email": application.email,
            "phone": application.phone,
            "team_role": application.team_role,
            "status": ApplicationStatus.PENDING,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert with service client so RLS does not block public signup
        response = supabase_client.service_client.table("volunteer_applications").insert(application_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to create volunteer application"
            )
        
        # Send confirmation email
        try:
            await gmail_email_sender.send_volunteer_signup_confirmation(
                application.email,
                application.name
            )
        except Exception as e:
            logger.error(f"Failed to send signup confirmation email: {e}")
            # Don't fail the signup if email fails
        
        return VolunteerApplicationResponse(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating volunteer application: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create volunteer application"
        )


@router.get("/", response_model=List[VolunteerApplicationResponse])
async def get_volunteer_applications(
    status: ApplicationStatus = None,
    team_role: str = None,
    current_user: TokenData = Depends(get_current_president)
):
    """Get all volunteer applications (president only)."""
    try:
        query = supabase_client.client.table("volunteer_applications").select("*")
        
        if status:
            query = query.eq("status", status.value)
        if team_role:
            query = query.eq("team_role", team_role)
        
        query = query.order("created_at", desc=True)
        
        # Use service client to bypass RLS; backend already checks president auth
        service_query = supabase_client.service_client.table("volunteer_applications").select("*")
        
        if status:
            service_query = service_query.eq("status", status.value)
        if team_role:
            service_query = service_query.eq("team_role", team_role)
        
        response = service_query.order("created_at", desc=True).execute()
        
        return [VolunteerApplicationResponse(**app) for app in response.data or []]
        
    except Exception as e:
        logger.error(f"Error getting volunteer applications: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve volunteer applications"
        )


@router.get("/{application_id}", response_model=VolunteerApplicationResponse)
async def get_volunteer_application(
    application_id: str,
    current_user: TokenData = Depends(get_current_president)
):
    """Get a specific volunteer application (president only)."""
    try:
        response = supabase_client.service_client.table("volunteer_applications").select("*").eq("id", application_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Volunteer application not found"
            )
        
        return VolunteerApplicationResponse(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting volunteer application: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve volunteer application"
        )


@router.put("/{application_id}/approve", response_model=VolunteerApplicationResponse)
async def approve_volunteer_application(
    application_id: str,
    current_user: TokenData = Depends(get_current_president)
):
    """Approve a volunteer application and create user account (president only)."""
    try:
        # Get the application
        app_response = supabase_client.service_client.table("volunteer_applications").select("*").eq("id", application_id).execute()
        
        if not app_response.data:
            raise HTTPException(
                status_code=404,
                detail="Volunteer application not found"
            )
        
        application = app_response.data[0]
        
        if application["status"] != ApplicationStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="Application has already been processed"
            )
        
        # Update application status
        update_data = {
            "status": ApplicationStatus.APPROVED,
            "reviewed_by": current_user.user_id,
            "reviewed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        updated_app = supabase_client.service_client.table("volunteer_applications").update(update_data).eq("id", application_id).execute()
        
        if not updated_app.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update application status"
            )
        
        # Create user account with temporary password
        from app.config import settings
        
        # Use default password from environment for development, or generate random for production
        if settings.environment == "development":
            temp_password = settings.default_volunteer_password
        else:
            import secrets
            import string
            temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
        
        # Hash the password using the same method as auth.py
        from app.utils.auth import hash_password
        password_hash = hash_password(temp_password)
        
        user_data = {
            "email": application["email"],
            "full_name": application["name"],
            "password_hash": password_hash,
            "role": "volunteer",
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        user_response = supabase_client.service_client.table("users").insert(user_data).execute()
        
        if not user_response.data:
            # Rollback application status if user creation fails
            supabase_client.service_client.table("volunteer_applications").update({
                "status": ApplicationStatus.PENDING,
                "reviewed_by": None,
                "reviewed_at": None,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", application_id).execute()
            
            raise HTTPException(
                status_code=500,
                detail="Failed to create user account"
            )
        
        # Send approval email with login credentials
        try:
            await gmail_email_sender.send_volunteer_approval_email(
                application["email"],
                application["name"],
                temp_password
            )
        except Exception as e:
            logger.error(f"Failed to send approval email: {e}")
            # Don't fail the approval if email fails
        
        return VolunteerApplicationResponse(**updated_app.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving volunteer application: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to approve volunteer application"
        )


@router.put("/{application_id}/reject", response_model=VolunteerApplicationResponse)
async def reject_volunteer_application(
    application_id: str,
    rejection_data: VolunteerApplicationRejection,
    current_user: TokenData = Depends(get_current_president)
):
    """Reject a volunteer application (president only)."""
    try:
        # Get the application
        app_response = supabase_client.service_client.table("volunteer_applications").select("*").eq("id", application_id).execute()
        
        if not app_response.data:
            raise HTTPException(
                status_code=404,
                detail="Volunteer application not found"
            )
        
        application = app_response.data[0]
        
        if application["status"] != ApplicationStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail="Application has already been processed"
            )
        
        # Update application status
        update_data = {
            "status": ApplicationStatus.REJECTED,
            "rejection_reason": rejection_data.rejection_reason,
            "reviewed_by": current_user.user_id,
            "reviewed_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        updated_app = supabase_client.service_client.table("volunteer_applications").update(update_data).eq("id", application_id).execute()
        
        if not updated_app.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update application status"
            )
        
        # Send rejection email
        try:
            await gmail_email_sender.send_volunteer_rejection_email(
                application["email"],
                application["name"],
                rejection_data.rejection_reason
            )
        except Exception as e:
            logger.error(f"Failed to send rejection email: {e}")
            # Don't fail the rejection if email fails
        
        return VolunteerApplicationResponse(**updated_app.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting volunteer application: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to reject volunteer application"
        )


@router.get("/stats/summary")
async def get_application_stats(current_user: TokenData = Depends(get_current_president)):
    """Get volunteer application statistics (president only)."""
    try:
        # Get counts by status
        pending_response = supabase_client.service_client.table("volunteer_applications").select("id", count="exact").eq("status", ApplicationStatus.PENDING).execute()
        approved_response = supabase_client.service_client.table("volunteer_applications").select("id", count="exact").eq("status", ApplicationStatus.APPROVED).execute()
        rejected_response = supabase_client.service_client.table("volunteer_applications").select("id", count="exact").eq("status", ApplicationStatus.REJECTED).execute()
        
        return {
            "pending": pending_response.count or 0,
            "approved": approved_response.count or 0,
            "rejected": rejected_response.count or 0,
            "total": (pending_response.count or 0) + (approved_response.count or 0) + (rejected_response.count or 0)
        }
        
    except Exception as e:
        logger.error(f"Error getting application stats: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve application statistics"
        )
