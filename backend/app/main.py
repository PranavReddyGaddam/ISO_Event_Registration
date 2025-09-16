"""Main FastAPI application."""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.config import settings
from app.routers import attendees, auth, events, pricing, volunteer_applications
from app.utils.supabase_client import supabase_client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Volunteer Event Check-in API",
    description="QR Code-based event check-in system with email integration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(attendees.router)
app.include_router(events.router)
app.include_router(pricing.router)
app.include_router(volunteer_applications.router)


@app.on_event("startup")
async def startup_event():
    """Initialize default users on startup."""
    try:
        await supabase_client.initialize_default_users()
        logger.info("Application startup completed")
    except Exception as e:
        logger.error(f"Startup error: {e}")


@app.get("/")
async def root():
    """Root endpoint."""
    try:
        # Get current event from database
        current_event = await supabase_client.get_current_event()
        event_name = current_event.get("name", settings.event_name) if current_event else settings.event_name
    except:
        event_name = settings.event_name
    
    return JSONResponse({
        "message": "Volunteer Event Check-in API",
        "version": "1.0.0",
        "docs": "/api/docs",
        "event": event_name,
        "status": "active"
    })


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({
        "status": "healthy",
        "environment": settings.environment,
        "event": settings.event_name
    })


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc) if settings.environment == "development" else None
        }
    )


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.environment == "development"
    )
