"""Supabase client utilities."""

import asyncio
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
from app.config import settings
from app.models.auth import UserRole
import logging

logger = logging.getLogger(__name__)


class SupabaseClient:
    """Async Supabase client wrapper."""
    
    def __init__(self):
        """Initialize Supabase client."""
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_key
        )
        self.service_client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
    
    async def get_default_event_id(self) -> Optional[str]:
        """Get the default event ID."""
        try:
            response = self.client.table("events").select("id").order("created_at").limit(1).execute()
            if response.data:
                return response.data[0]["id"]
            return None
        except Exception as e:
            logger.error(f"Error getting default event ID: {e}")
            return None
    
    async def create_attendee(self, attendee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new attendee in the database."""
        try:
            # If no event_id provided, use the default event
            if "event_id" not in attendee_data:
                default_event_id = await self.get_default_event_id()
                if default_event_id:
                    attendee_data["event_id"] = default_event_id
                else:
                    # Create a default event if none exists
                    default_event = await self.create_default_event()
                    if default_event:
                        attendee_data["event_id"] = default_event["id"]
                    else:
                        raise Exception("No event available for registration")
            
            response = self.client.table("attendees").insert(attendee_data).execute()
            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to create attendee")
        except Exception as e:
            logger.error(f"Error creating attendee: {e}")
            raise
    
    async def get_current_event(self) -> Optional[Dict[str, Any]]:
        """Get the current active event."""
        try:
            response = self.client.table("events").select("*").order("created_at", desc=True).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting current event: {e}")
            return None

    async def create_default_event(self) -> Optional[Dict[str, Any]]:
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
            
            response = self.client.table("events").insert(event_data).execute()
            if response.data:
                logger.info("Default event created successfully")
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error creating default event: {e}")
            return None
    
    async def get_attendee_by_qr_id(self, qr_code_id: str) -> Optional[Dict[str, Any]]:
        """Get attendee by QR code ID."""
        try:
            response = self.client.table("attendees").select("*").eq("qr_code_id", qr_code_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting attendee by QR ID: {e}")
            return None
    
    async def check_attendee_exists(self, email: str, phone: str = None) -> Optional[Dict[str, Any]]:
        """Check if an attendee already exists with the given email (phone validation removed).
        
        Note: This method now always returns None to allow multiple registrations with the same email.
        """
        # Allow multiple registrations with the same email - always return None
        return None
    
    async def update_attendee_checkin(self, qr_code_id: str) -> Optional[Dict[str, Any]]:
        """Update attendee check-in status."""
        try:
            from datetime import datetime
            response = self.client.table("attendees").update({
                "is_checked_in": True,
                "checked_in_at": datetime.utcnow().isoformat()
            }).eq("qr_code_id", qr_code_id).execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error updating attendee check-in: {e}")
            return None
    
    async def get_attendees(
        self, 
        checked_in: Optional[bool] = None,
        search: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get attendees with optional filters and total count."""
        try:
            if search:
                # For search, we'll use a different approach since or_ is not supported
                # We'll search in name and email separately and combine results
                name_response = self.client.table("attendees").select("*").ilike("name", f"%{search}%").execute()
                email_response = self.client.table("attendees").select("*").ilike("email", f"%{search}%").execute()
                
                # Combine and deduplicate results
                all_results = []
                seen_ids = set()
                
                for result in name_response.data or []:
                    if result["id"] not in seen_ids:
                        all_results.append(result)
                        seen_ids.add(result["id"])
                
                for result in email_response.data or []:
                    if result["id"] not in seen_ids:
                        all_results.append(result)
                        seen_ids.add(result["id"])
                
                # Apply checked_in filter if specified
                if checked_in is not None:
                    all_results = [r for r in all_results if r.get("is_checked_in") == checked_in]
                
                # Sort by created_at desc and apply limit/offset
                all_results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
                total_count = len(all_results)
                paginated_results = all_results[offset:offset + limit]
                return paginated_results, total_count
            
            # If no search, use the normal query approach
            query = self.client.table("attendees").select("*", count="exact")
            
            if checked_in is not None:
                query = query.eq("is_checked_in", checked_in)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            return response.data or [], response.count or 0
        except Exception as e:
            logger.error(f"Error getting attendees: {e}")
            return [], 0
    
    async def get_event_stats(self) -> Dict[str, Any]:
        """Get event statistics."""
        try:
            # Get total counts
            total_response = self.client.table("attendees").select("id", count="exact").execute()
            total_registered = total_response.count or 0
            
            checked_in_response = self.client.table("attendees").select("id", count="exact").eq("is_checked_in", True).execute()
            total_checked_in = checked_in_response.count or 0
            
            # Calculate percentage
            checked_in_percentage = (total_checked_in / total_registered * 100) if total_registered > 0 else 0
            
            # Get ticket statistics
            ticket_stats_response = self.client.table("attendees").select("ticket_quantity", "total_price", "payment_mode").execute()
            total_tickets_sold = 0
            total_revenue = 0.0
            revenue_cash = 0.0
            revenue_zelle = 0.0
            
            if ticket_stats_response.data:
                total_tickets_sold = sum(ticket.get("ticket_quantity", 1) for ticket in ticket_stats_response.data)
                total_revenue = sum(float(ticket.get("total_price", 0)) for ticket in ticket_stats_response.data)
                for row in ticket_stats_response.data:
                    if str(row.get("payment_mode", "")).lower() == "cash":
                        revenue_cash += float(row.get("total_price", 0))
                    elif str(row.get("payment_mode", "")).lower() == "zelle":
                        revenue_zelle += float(row.get("total_price", 0))
            
            # Get recent check-ins
            recent_response = self.client.table("attendees").select("*").eq("is_checked_in", True).order("checked_in_at", desc=True).limit(5).execute()
            recent_checkins = recent_response.data or []
            
            return {
                "total_registered": total_registered,
                "total_checked_in": total_checked_in,
                "checked_in_percentage": round(checked_in_percentage, 2),
                "total_tickets_sold": total_tickets_sold,
                "total_revenue": round(total_revenue, 2),
                "revenue_cash": round(revenue_cash, 2),
                "revenue_zelle": round(revenue_zelle, 2),
                "recent_checkins": recent_checkins
            }
        except Exception as e:
            logger.error(f"Error getting event stats: {e}")
            return {
                "total_registered": 0,
                "total_checked_in": 0,
                "checked_in_percentage": 0,
                "recent_checkins": []
            }
    
    async def upload_qr_code(self, qr_code_id: str, qr_code_data: bytes) -> Optional[str]:
        """Upload QR code to Supabase storage."""
        try:
            file_path = f"qr_codes/{qr_code_id}.png"
            
            response = self.service_client.storage.from_("qr-codes").upload(
                file_path,
                qr_code_data,
                {"content-type": "image/png"}
            )
            
            if response:
                # Get public URL
                public_url = self.service_client.storage.from_("qr-codes").get_public_url(file_path)
                return public_url
            return None
        except Exception as e:
            logger.error(f"Error uploading QR code: {e}")
            return None
    
    # User management methods
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Create a new user in the database."""
        try:
            # Use service client for user creation to bypass RLS
            response = self.service_client.table("users").insert(user_data).execute()
            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to create user")
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email."""
        try:
            # Use service client to bypass RLS for authentication
            response = self.service_client.table("users").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by email: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        try:
            # Use service client to bypass RLS
            response = self.service_client.table("users").select("*").eq("id", user_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error getting user by ID: {e}")
            return None
    
    async def update_user_last_login(self, user_id: str) -> None:
        """Update user's last login timestamp."""
        try:
            from datetime import datetime
            # Use service client to bypass RLS
            self.service_client.table("users").update({
                "last_login": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
        except Exception as e:
            logger.error(f"Error updating user last login: {e}")
    
    async def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users (president only)."""
        try:
            # Use service client to bypass RLS
            response = self.service_client.table("users").select("*").order("created_at", desc=True).execute()
            return response.data or []
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []
    
    async def initialize_default_users(self) -> None:
        """Initialize default users if none exist."""
        try:
            from app.utils.auth import create_default_users
            
            # Check if any users exist
            response = self.service_client.table("users").select("id", count="exact").execute()
            if response.count and response.count > 0:
                logger.info("Users already exist, skipping default user creation")
                return
            
            # Create default users
            default_users = create_default_users()
            for user_data in default_users:
                await self.create_user(user_data)
            
            logger.info("Default users created successfully")
            
        except Exception as e:
            logger.error(f"Error initializing default users: {e}")


# Global Supabase client instance
supabase_client = SupabaseClient()
