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
    
    async def create_guest(self, guest_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new guest in the database."""
        try:
            # If no event_id provided, use the default event
            if "event_id" not in guest_data:
                default_event_id = await self.get_default_event_id()
                if default_event_id:
                    guest_data["event_id"] = default_event_id
                else:
                    # Create a default event if none exists
                    default_event = await self.create_default_event()
                    if default_event:
                        guest_data["event_id"] = default_event["id"]
                    else:
                        raise Exception("No event available for registration")
            
            # Use service client to bypass RLS for guest creation
            response = self.service_client.table("guests").insert(guest_data).execute()
            if response.data:
                return response.data[0]
            else:
                raise Exception("Failed to create guest")
        except Exception as e:
            logger.error(f"Error creating guest: {e}")
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
        """Get attendee or guest by QR code ID."""
        try:
            # First check attendees table
            response = self.client.table("attendees").select("*").eq("qr_code_id", qr_code_id).execute()
            if response.data:
                return response.data[0]
            
            # If not found in attendees, check guests table
            guest_response = self.client.table("guests").select("*").eq("qr_code_id", qr_code_id).execute()
            if guest_response.data:
                # Add a marker to identify this as a guest
                guest_data = guest_response.data[0]
                guest_data["is_guest"] = True
                return guest_data
            
            return None
        except Exception as e:
            logger.error(f"Error getting attendee/guest by QR ID: {e}")
            return None
    
    async def check_attendee_exists(self, email: str, phone: str = None) -> Optional[Dict[str, Any]]:
        """Check if an attendee already exists with the given email (phone validation removed).
        
        Note: This method now always returns None to allow multiple registrations with the same email.
        """
        # Allow multiple registrations with the same email - always return None
        return None
    
    async def update_attendee_checkin(self, qr_code_id: str) -> Optional[Dict[str, Any]]:
        """Update attendee or guest check-in status."""
        try:
            from datetime import datetime
            checkin_data = {
                "is_checked_in": True,
                "checked_in_at": datetime.utcnow().isoformat()
            }
            
            # First try to update in attendees table
            response = self.client.table("attendees").update(checkin_data).eq("qr_code_id", qr_code_id).execute()
            if response.data:
                return response.data[0]
            
            # If not found in attendees, try guests table
            guest_response = self.client.table("guests").update(checkin_data).eq("qr_code_id", qr_code_id).execute()
            if guest_response.data:
                # Add guest marker and return
                guest_data = guest_response.data[0]
                guest_data["is_guest"] = True
                return guest_data
            
            return None
        except Exception as e:
            logger.error(f"Error updating attendee/guest check-in: {e}")
            return None
    
    async def _enrich_attendees_with_volunteer_info(self, attendees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Enrich attendee data with volunteer information."""
        if not attendees:
            return attendees
        
        # Get unique volunteer IDs
        volunteer_ids = set()
        for attendee in attendees:
            if attendee.get("created_by"):
                volunteer_ids.add(attendee["created_by"])
        
        if not volunteer_ids:
            return attendees
        
        # Fetch volunteer information
        try:
            volunteers_resp = self.service_client.table("users").select("id, full_name, email, team_role").in_("id", list(volunteer_ids)).execute()
            volunteers = {v["id"]: v for v in volunteers_resp.data or []}
            
            # Enrich attendee data
            for attendee in attendees:
                volunteer_id = attendee.get("created_by")
                if volunteer_id and volunteer_id in volunteers:
                    volunteer = volunteers[volunteer_id]
                    attendee["volunteer_name"] = volunteer.get("full_name")
                    attendee["volunteer_email"] = volunteer.get("email")
                    attendee["volunteer_team_role"] = volunteer.get("team_role")
                else:
                    attendee["volunteer_name"] = None
                    attendee["volunteer_email"] = None
                    attendee["volunteer_team_role"] = None
            
        except Exception as e:
            logger.error(f"Error enriching attendees with volunteer info: {e}")
            # If enrichment fails, just add None values
            for attendee in attendees:
                attendee["volunteer_name"] = None
                attendee["volunteer_email"] = None
                attendee["volunteer_team_role"] = None
        
        return attendees

    async def get_attendees(
        self, 
        checked_in: Optional[bool] = None,
        search: Optional[str] = None,
        food_option: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        sort_by: Optional[str] = None,
        sort_dir: str = "desc"
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
                
                # Apply food_option filter if specified
                if food_option is not None:
                    all_results = [r for r in all_results if r.get("food_option") == food_option]
                
                # Group attendees by person and calculate totals
                grouped_results = self._group_attendees_by_person(all_results)
                
                # Sort server-side based on requested column
                reverse = (str(sort_dir).lower() != "asc")
                key = (sort_by or "created_at").lower()
                def sort_key(item: Dict[str, Any]):
                    if key in ("created_at", "registered_at"):
                        return str(item.get("created_at") or "")
                    if key == "total_tickets_per_person":
                        return int(item.get("total_tickets_per_person", 0))
                    if key == "total_registrations":
                        return int(item.get("total_registrations", 0))
                    if key == "current_tickets":
                        return int(item.get("current_tickets", 0))
                    if key == "name":
                        return str(item.get("name", "")).lower()
                    if key == "email":
                        return str(item.get("email", "")).lower()
                    return str(item.get("created_at") or "")
                grouped_results.sort(key=sort_key, reverse=reverse)
                total_count = len(grouped_results)
                paginated_results = grouped_results[offset:offset + limit]
                
                # Enrich with volunteer information
                enriched_results = await self._enrich_attendees_with_volunteer_info(paginated_results)
                return enriched_results, total_count
            
            # If no search, use the normal query approach
            query = self.client.table("attendees").select("*", count="exact")
            
            if checked_in is not None:
                query = query.eq("is_checked_in", checked_in)
            
            if food_option is not None:
                query = query.eq("food_option", food_option)
            
            response = query.order("created_at", desc=True).execute()
            attendees = response.data or []
            
            # Group attendees by person and calculate totals
            grouped_attendees = self._group_attendees_by_person(attendees)
            
            # Sort server-side based on requested column
            reverse = (str(sort_dir).lower() != "asc")
            key = (sort_by or "created_at").lower()
            def sort_key(item: Dict[str, Any]):
                if key in ("created_at", "registered_at"):
                    return str(item.get("created_at") or "")
                if key == "total_tickets_per_person":
                    return int(item.get("total_tickets_per_person", 0))
                if key == "total_registrations":
                    return int(item.get("total_registrations", 0))
                if key == "current_tickets":
                    return int(item.get("current_tickets", 0))
                if key == "name":
                    return str(item.get("name", "")).lower()
                if key == "email":
                    return str(item.get("email", "")).lower()
                return str(item.get("created_at") or "")
            grouped_attendees.sort(key=sort_key, reverse=reverse)
            
            # Apply pagination to grouped results
            total_count = len(grouped_attendees)
            paginated_results = grouped_attendees[offset:offset + limit]
            
            # Enrich with volunteer information
            enriched_results = await self._enrich_attendees_with_volunteer_info(paginated_results)
            return enriched_results, total_count
        except Exception as e:
            logger.error(f"Error getting attendees: {e}")
            return [], 0
    
    def _group_attendees_by_person(self, attendees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group attendees by person (name + email) and calculate totals."""
        person_groups = {}
        
        for attendee in attendees:
            # Create a unique key for each person
            person_key = f"{attendee.get('name', '').lower()}_{attendee.get('email', '').lower()}"
            
            if person_key not in person_groups:
                person_groups[person_key] = {
                    'attendees': [],
                    'total_tickets': 0,
                    'total_cash': 0,
                    'total_zelle': 0,
                    'cash_count': 0,
                    'zelle_count': 0,
                    'with_food_count': 0,
                    'without_food_count': 0,
                    'checked_in_count': 0,
                    'total_count': 0,
                    'latest_registration': None,
                    'latest_created_at': None
                }
            
            # Add attendee to group
            person_groups[person_key]['attendees'].append(attendee)
            
            # Calculate totals
            ticket_qty = attendee.get('ticket_quantity', 0)
            total_price = attendee.get('total_price', 0)
            payment_mode = attendee.get('payment_mode', 'cash')
            food_option = attendee.get('food_option', 'with_food')
            is_checked_in = attendee.get('is_checked_in', False)
            
            person_groups[person_key]['total_tickets'] += ticket_qty
            person_groups[person_key]['total_count'] += 1
            
            if payment_mode == 'cash':
                person_groups[person_key]['total_cash'] += total_price
                person_groups[person_key]['cash_count'] += 1
            else:
                person_groups[person_key]['total_zelle'] += total_price
                person_groups[person_key]['zelle_count'] += 1
            
            if food_option == 'with_food':
                person_groups[person_key]['with_food_count'] += 1
            else:
                person_groups[person_key]['without_food_count'] += 1
            
            if is_checked_in:
                person_groups[person_key]['checked_in_count'] += 1
            
            # Track the most recent registration
            created_at = attendee.get('created_at', '')
            if (person_groups[person_key]['latest_created_at'] is None or 
                created_at > person_groups[person_key]['latest_created_at']):
                person_groups[person_key]['latest_created_at'] = created_at
                person_groups[person_key]['latest_registration'] = attendee
        
        # Convert to list of grouped attendees
        grouped_attendees = []
        for person_key, group_data in person_groups.items():
            # Use the first attendee as the base record
            base_attendee = group_data['attendees'][0].copy()
            
            # Add calculated fields
            latest_registration = group_data['latest_registration']
            current_tickets = latest_registration.get('ticket_quantity', 0) if latest_registration else 0
            
            base_attendee.update({
                'total_tickets_per_person': group_data['total_tickets'],
                'total_registrations': group_data['total_count'],
                'current_tickets': current_tickets,  # Tickets from most recent registration
                'total_cash_amount': group_data['total_cash'],
                'total_zelle_amount': group_data['total_zelle'],
                'cash_registrations': group_data['cash_count'],
                'zelle_registrations': group_data['zelle_count'],
                'with_food_registrations': group_data['with_food_count'],
                'without_food_registrations': group_data['without_food_count'],
                'checked_in_registrations': group_data['checked_in_count'],
                'all_registrations': group_data['attendees']
            })
            
            grouped_attendees.append(base_attendee)
        
        return grouped_attendees
    
    async def get_attendees_by_email(
        self, 
        email: str,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get all individual registrations for a specific email address."""
        try:
            # Use case-insensitive email matching
            query = self.client.table("attendees").select("*", count="exact").ilike("email", email)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            attendees = response.data or []
            
            # Enrich with volunteer information
            enriched_attendees = await self._enrich_attendees_with_volunteer_info(attendees)
            return enriched_attendees, response.count or 0
        except Exception as e:
            logger.error(f"Error getting attendees by email: {e}")
            return [], 0
    
    async def get_attendees_by_volunteer(
        self, 
        volunteer_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[Dict[str, Any]], int]:
        """Get attendees registered by a specific volunteer."""
        try:
            query = self.client.table("attendees").select("*", count="exact").eq("created_by", volunteer_id)
            
            response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            attendees = response.data or []
            
            # Enrich with volunteer information
            enriched_attendees = await self._enrich_attendees_with_volunteer_info(attendees)
            return enriched_attendees, response.count or 0
        except Exception as e:
            logger.error(f"Error getting attendees by volunteer: {e}")
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
    
    async def delete_qr_code(self, qr_code_id: str) -> bool:
        """Delete a QR code from storage."""
        try:
            file_path = f"{qr_code_id}.png"
            result = self.service_client.storage.from_("qr-codes").remove([file_path])
            logger.info(f"Deleted QR code: {qr_code_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting QR code {qr_code_id}: {e}")
            return False
    
    async def delete_attendee(self, attendee_id: str) -> bool:
        """Delete an attendee record from the database."""
        try:
            response = self.service_client.table("attendees").delete().eq("id", attendee_id).execute()
            logger.info(f"Deleted attendee: {attendee_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting attendee {attendee_id}: {e}")
            return False
    
    async def delete_guest(self, guest_id: str) -> bool:
        """Delete a guest record from the database."""
        try:
            response = self.service_client.table("guests").delete().eq("id", guest_id).execute()
            logger.info(f"Deleted guest: {guest_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting guest {guest_id}: {e}")
            return False
    
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
    
    async def update_user_cleared_amount(self, user_id: str, cleared_amount: float) -> Optional[Dict[str, Any]]:
        """Update the cleared amount for a user."""
        try:
            response = self.service_client.table("users").update({
                "cleared_amount": cleared_amount
            }).eq("id", user_id).execute()
            
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error updating user cleared amount: {e}")
            return None
    
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
    
    # Password reset methods
    async def create_password_reset_token(self, user_id: str, token: str, expires_at: str) -> Optional[Dict[str, Any]]:
        """Create a password reset token."""
        try:
            # First, invalidate any existing tokens for this user
            await self.invalidate_user_reset_tokens(user_id)
            
            token_data = {
                "user_id": user_id,
                "token": token,
                "expires_at": expires_at,
                "used": False
            }
            
            response = self.service_client.table("password_reset_tokens").insert(token_data).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error creating password reset token: {e}")
            return None
    
    async def get_password_reset_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Get a password reset token by token string."""
        try:
            from datetime import datetime
            
            response = self.service_client.table("password_reset_tokens").select("*").eq("token", token).execute()
            if not response.data:
                return None
            
            token_data = response.data[0]
            
            # Check if token is expired
            expires_at = datetime.fromisoformat(token_data["expires_at"].replace('Z', '+00:00'))
            if datetime.now(expires_at.tzinfo) > expires_at:
                logger.warning(f"Password reset token expired: {token}")
                return None
            
            # Check if token is already used
            if token_data.get("used", False):
                logger.warning(f"Password reset token already used: {token}")
                return None
            
            return token_data
        except Exception as e:
            logger.error(f"Error getting password reset token: {e}")
            return None
    
    async def mark_password_reset_token_used(self, token: str) -> bool:
        """Mark a password reset token as used."""
        try:
            response = self.service_client.table("password_reset_tokens").update({
                "used": True
            }).eq("token", token).execute()
            
            return bool(response.data)
        except Exception as e:
            logger.error(f"Error marking password reset token as used: {e}")
            return False
    
    async def invalidate_user_reset_tokens(self, user_id: str) -> None:
        """Invalidate all existing reset tokens for a user."""
        try:
            self.service_client.table("password_reset_tokens").update({
                "used": True
            }).eq("user_id", user_id).eq("used", False).execute()
            
            logger.info(f"Invalidated existing reset tokens for user: {user_id}")
        except Exception as e:
            logger.error(f"Error invalidating user reset tokens: {e}")
    
    async def cleanup_expired_reset_tokens(self) -> int:
        """Clean up expired password reset tokens."""
        try:
            from datetime import datetime
            
            # Delete tokens that are expired or older than 24 hours
            cutoff_time = (datetime.utcnow()).isoformat()
            
            response = self.service_client.table("password_reset_tokens").delete().lt("expires_at", cutoff_time).execute()
            
            deleted_count = len(response.data) if response.data else 0
            logger.info(f"Cleaned up {deleted_count} expired password reset tokens")
            
            return deleted_count
        except Exception as e:
            logger.error(f"Error cleaning up expired reset tokens: {e}")
            return 0

    async def get_attendees_with_qr_codes_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Get all attendees for a specific email with QR code data."""
        try:
            response = self.service_client.table("attendees").select(
                "id, name, email, phone, ticket_quantity, total_price, payment_mode, "
                "created_at, checked_in_at, created_by, qr_code_id, qr_code_url, is_checked_in"
            ).eq("email", email).order("created_at", desc=True).execute()
            
            if not response.data:
                logger.info(f"No attendees found for email: {email}")
                return []
            
            attendees = response.data
            
            # Get user data for created_by mapping
            user_ids = list(set(attendee.get("created_by") for attendee in attendees if attendee.get("created_by")))
            users_data = {}
            if user_ids:
                users_resp = self.service_client.table("users").select("id, full_name, email").in_("id", user_ids).execute()
                users_data = {user["id"]: user for user in users_resp.data or []}
            
            # Add volunteer information to each attendee
            for attendee in attendees:
                created_by_user = users_data.get(attendee.get("created_by"), {})
                attendee["volunteer_name"] = created_by_user.get("full_name", "")
                attendee["volunteer_email"] = created_by_user.get("email", "")
            
            logger.info(f"Found {len(attendees)} attendees for email: {email}")
            return attendees
            
        except Exception as e:
            logger.error(f"Error getting attendees by email: {e}")
            return []


# Global Supabase client instance
supabase_client = SupabaseClient()
