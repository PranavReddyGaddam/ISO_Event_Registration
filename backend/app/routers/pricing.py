"""Ticket pricing API routes."""

from typing import List
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.attendee import (
    TicketPricingInfo,
    TicketPricingTier,
    TicketCalculationRequest,
    TicketCalculationResponse,
    TicketPricingResponse,
    TicketPricingCreate,
    TicketPricingUpdate
)
from app.utils.supabase_client import supabase_client
from app.utils.auth import get_current_user, get_current_president
from app.models.auth import TokenData

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


@router.get("", response_model=List[TicketPricingResponse])
async def get_all_pricing_tiers(current_user: TokenData = Depends(get_current_president)):
    """Get all pricing tiers (alias for admin/tiers)."""
    return await get_admin_pricing_tiers(current_user=current_user)


@router.get("/tiers", response_model=TicketPricingInfo)
async def get_pricing_tiers(event_id: str):
    """Get all pricing tiers for an event."""
    try:
        # Get pricing tiers from database (only active ones)
        response = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", event_id).eq("is_active", True).order("quantity_from").execute()
        
        if not response.data:
            return TicketPricingInfo(tiers=[], max_tickets=20)
        
        tiers = []
        for tier_data in response.data:
            tier = TicketPricingTier(
                quantity_from=tier_data["quantity_from"],
                quantity_to=tier_data["quantity_to"],
                price_per_ticket=float(tier_data["price_per_ticket"]),
                total_price=0  # Will be calculated when needed
            )
            tiers.append(tier)
        
        return TicketPricingInfo(tiers=tiers, max_tickets=20)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pricing tiers: {str(e)}"
        )


@router.post("/calculate", response_model=TicketCalculationResponse)
async def calculate_ticket_price(
    request: TicketCalculationRequest,
    event_id: str
):
    """Calculate ticket price for a given quantity and food option."""
    try:
        # Get pricing tiers from database (only active ones, filtered by food option)
        response = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", event_id).eq("is_active", True).eq("food_option", request.food_option).order("quantity_from").execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pricing tiers found for this event"
            )
        
        # Find the appropriate pricing tier
        price_per_ticket = None
        pricing_tier = None
        
        for tier_data in response.data:
            if (request.quantity >= tier_data["quantity_from"] and 
                request.quantity <= tier_data["quantity_to"]):
                price_per_ticket = float(tier_data["price_per_ticket"])
                pricing_tier = TicketPricingTier(
                    quantity_from=tier_data["quantity_from"],
                    quantity_to=tier_data["quantity_to"],
                    price_per_ticket=price_per_ticket,
                    total_price=price_per_ticket * request.quantity
                )
                break
        
        if price_per_ticket is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pricing tier found for the specified quantity"
            )
        
        total_price = price_per_ticket * request.quantity
        
        return TicketCalculationResponse(
            quantity=request.quantity,
            price_per_ticket=price_per_ticket,
            total_price=total_price,
            pricing_tier=pricing_tier
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate ticket price: {str(e)}"
        )


@router.get("/admin/tiers", response_model=List[TicketPricingResponse])
async def get_admin_pricing_tiers(
    event_id: str = None,
    current_user: TokenData = Depends(get_current_president)
):
    """Get all pricing tiers for admin management (president only)."""
    try:
        query = supabase_client.client.table("ticket_pricing").select("*")
        if event_id:
            query = query.eq("event_id", event_id)
        response = query.order("quantity_from").execute()
        
        if not response.data:
            return []
        
        tiers = []
        for tier_data in response.data:
            tier = TicketPricingResponse(
                id=tier_data["id"],
                event_id=tier_data["event_id"],
                quantity_from=tier_data["quantity_from"],
                quantity_to=tier_data["quantity_to"],
                price_per_ticket=float(tier_data["price_per_ticket"]),
                created_at=tier_data["created_at"],
                updated_at=tier_data["updated_at"]
            )
            tiers.append(tier)
        
        return tiers
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pricing tiers: {str(e)}"
        )


@router.post("/admin/tiers", response_model=TicketPricingResponse)
async def create_pricing_tier(
    tier_data: TicketPricingCreate,
    current_user: TokenData = Depends(get_current_president)
):
    """Create a new pricing tier (president only)."""
    try:
        # Check for overlapping ranges
        existing_tiers = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", tier_data.event_id).execute()
        
        for existing_tier in existing_tiers.data:
            if (tier_data.quantity_from <= existing_tier["quantity_to"] and 
                tier_data.quantity_to >= existing_tier["quantity_from"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Pricing tier range overlaps with existing tier"
                )
        
        # Create new tier
        new_tier_data = {
            "event_id": tier_data.event_id,
            "quantity_from": tier_data.quantity_from,
            "quantity_to": tier_data.quantity_to,
            "price_per_ticket": tier_data.price_per_ticket
        }
        
        response = supabase_client.client.table("ticket_pricing").insert(new_tier_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create pricing tier"
            )
        
        created_tier = response.data[0]
        return TicketPricingResponse(
            id=created_tier["id"],
            event_id=created_tier["event_id"],
            quantity_from=created_tier["quantity_from"],
            quantity_to=created_tier["quantity_to"],
            price_per_ticket=float(created_tier["price_per_ticket"]),
            created_at=created_tier["created_at"],
            updated_at=created_tier["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create pricing tier: {str(e)}"
        )


@router.put("/admin/tiers/{tier_id}", response_model=TicketPricingResponse)
async def update_pricing_tier(
    tier_id: str,
    tier_data: TicketPricingUpdate,
    current_user: TokenData = Depends(get_current_president)
):
    """Update an existing pricing tier (president only)."""
    try:
        # Get existing tier
        existing_response = supabase_client.client.table("ticket_pricing").select("*").eq("id", tier_id).execute()
        
        if not existing_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pricing tier not found"
            )
        
        existing_tier = existing_response.data[0]
        
        # Check for overlapping ranges with other tiers
        other_tiers_response = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", existing_tier["event_id"]).neq("id", tier_id).execute()
        
        for other_tier in other_tiers_response.data:
            if (tier_data.quantity_from <= other_tier["quantity_to"] and 
                tier_data.quantity_to >= other_tier["quantity_from"]):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Pricing tier range overlaps with existing tier"
                )
        
        # Update tier
        update_data = {}
        if tier_data.quantity_from is not None:
            update_data["quantity_from"] = tier_data.quantity_from
        if tier_data.quantity_to is not None:
            update_data["quantity_to"] = tier_data.quantity_to
        if tier_data.price_per_ticket is not None:
            update_data["price_per_ticket"] = tier_data.price_per_ticket
        
        response = supabase_client.client.table("ticket_pricing").update(update_data).eq("id", tier_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update pricing tier"
            )
        
        updated_tier = response.data[0]
        return TicketPricingResponse(
            id=updated_tier["id"],
            event_id=updated_tier["event_id"],
            quantity_from=updated_tier["quantity_from"],
            quantity_to=updated_tier["quantity_to"],
            price_per_ticket=float(updated_tier["price_per_ticket"]),
            created_at=updated_tier["created_at"],
            updated_at=updated_tier["updated_at"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update pricing tier: {str(e)}"
        )


@router.delete("/admin/tiers/{tier_id}")
async def delete_pricing_tier(
    tier_id: str,
    current_user: TokenData = Depends(get_current_president)
):
    """Delete a pricing tier (president only)."""
    try:
        response = supabase_client.client.table("ticket_pricing").delete().eq("id", tier_id).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pricing tier not found"
            )
        
        return {"message": "Pricing tier deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete pricing tier: {str(e)}"
        )


@router.post("/admin/create-default-tiers")
async def create_default_pricing_tiers(
    event_id: str,
    current_user: TokenData = Depends(get_current_president)
):
    """Create default pricing tiers for an event (president only)."""
    try:
        # Check if default tiers already exist
        existing_tiers = supabase_client.client.table("ticket_pricing").select("*").eq("event_id", event_id).execute()
        
        if existing_tiers.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Pricing tiers already exist for this event"
            )
        
        # Create default pricing tiers
        default_tiers = [
            {
                "event_id": event_id,
                "quantity_from": 1,
                "quantity_to": 251,
                "price_per_ticket": 15.00,
                "is_active": True,
                "food_option": "without_food"
            },
            {
                "event_id": event_id,
                "quantity_from": 1,
                "quantity_to": 251,
                "price_per_ticket": 18.00,
                "is_active": True,
                "food_option": "with_food"
            }
        ]
        
        # Insert default tiers
        response = supabase_client.client.table("ticket_pricing").insert(default_tiers).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create default pricing tiers"
            )
        
        return {"message": "Default pricing tiers created successfully", "tiers": response.data}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create default pricing tiers: {str(e)}"
        )
