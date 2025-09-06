"""Gmail SMTP email integration utilities."""

import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import settings
from app.utils.supabase_client import supabase_client
import logging

logger = logging.getLogger(__name__)


class GmailEmailSender:
    """Gmail SMTP email sender integration."""
    
    def __init__(self):
        """Initialize Gmail SMTP email sender."""
        self.email = settings.gmail_email
        self.password = settings.gmail_app_password
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
    
    async def get_current_event_details(self) -> Dict[str, str]:
        """Get current event details from database."""
        try:
            current_event = await supabase_client.get_current_event()
            if current_event:
                return {
                    "name": current_event.get("name", settings.event_name),
                    "date": current_event.get("event_date", settings.event_date),
                    "location": current_event.get("location", "TBD")
                }
        except Exception as e:
            logger.error(f"Error getting current event details: {e}")
        
        # Fallback to settings if database fails
        return {
            "name": settings.event_name,
            "date": settings.event_date,
            "location": "TBD"
        }
    
    async def send_registration_email(
        self,
        email: str,
        name: str,
        qr_code_url: str,
        qr_code_id: str,
        ticket_quantity: int = 1,
        total_price: float = 0.0
    ) -> bool:
        """
        Send registration confirmation email with QR code.
        
        Args:
            email: Recipient email address
            name: Recipient name
            qr_code_url: URL to the QR code image
            qr_code_id: Unique QR code identifier
            ticket_quantity: Number of tickets purchased
            total_price: Total amount paid
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create email content
            # Get current event details
            event_details = await self.get_current_event_details()
            subject = f"Welcome to {event_details['name']} - Your QR Code Inside!"
            html_content = self.create_registration_email_content(name, qr_code_url, qr_code_id, ticket_quantity, total_price, event_details)
            
            # Send email
            success = await self._send_email(email, subject, html_content)
            
            if success:
                logger.info(f"Registration email sent to: {email}")
            else:
                logger.error(f"Failed to send registration email to: {email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending registration email: {e}")
            return False
    
    async def send_checkin_confirmation(self, email: str, name: str) -> bool:
        """Send check-in confirmation email."""
        try:
            # Get current event details
            event_details = await self.get_current_event_details()
            subject = f"Check-in Confirmed - {event_details['name']}"
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1>Check-in Confirmed!</h1>
                    </div>
                    <div style="background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
                        <h2>Hi {name},</h2>
                        <p>Your check-in for <strong>{event_details['name']}</strong> has been confirmed.</p>
                        <p>Thank you for being here!</p>
                        <p>We look forward to a great event together.</p>
                        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                        <p style="text-align: center; color: #6b7280; font-size: 14px;">
                            <em>This is an automated message. Please do not reply to this email.</em>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            success = await self._send_email(email, subject, html_content)
            
            if success:
                logger.info(f"Check-in confirmation sent to: {email}")
            else:
                logger.error(f"Failed to send check-in confirmation to: {email}")
            
            return success
                
        except Exception as e:
            logger.error(f"Error sending check-in confirmation: {e}")
            return False
    
    async def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using Gmail SMTP."""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                self._send_email_sync,
                to_email,
                subject,
                html_content,
            )
        except Exception as e:
            logger.error(f"Error in async email sending: {e}")
            return False

    def _send_email_sync(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email synchronously using Gmail SMTP."""
        try:
            logger.info(f"Starting Gmail SMTP email send to: {to_email}")
            
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = self.email
            message["To"] = to_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
            
            # Connect to SMTP server
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            
            # Login
            server.login(self.email, self.password)
            
            # Send email
            server.send_message(message)
            server.quit()
            
            logger.info(f"Email sent successfully to: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail SMTP send error: {e}")
            logger.exception("Full traceback:")
            return False
    
    def create_registration_email_content(
        self,
        name: str,
        qr_code_url: str,
        qr_code_id: str,
        ticket_quantity: int = 1,
        total_price: float = 0.0,
        event_details: Dict[str, str] = None
    ) -> str:
        """Create HTML email content for registration confirmation."""
        # Use provided event details or fallback to settings
        if event_details is None:
            event_details = {
                "name": settings.event_name,
                "date": settings.event_date,
                "location": "TBD"
            }
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to {event_details['name']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .qr-code {{ text-align: center; margin: 30px 0; }}
                .qr-code img {{ max-width: 200px; height: auto; border: 2px solid #e5e7eb; border-radius: 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to {event_details['name']}!</h1>
                    <p>Thank you for registering, {name}!</p>
                </div>
                <div class="content">
                    <h2>Your Registration is Confirmed!</h2>
                    <p>We're excited to have you join us for {event_details['name']} on {event_details['date']}.</p>
                    
                    <div class="info-box">
                        <h4>Ticket Information:</h4>
                        <p><strong>Number of Tickets:</strong> {ticket_quantity}</p>
                        <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                    </div>
                    
                    <h3>Your Personal QR Code</h3>
                    <p>Please save this QR code and bring it with you to the event for quick check-in:</p>
                    
                    <div class="qr-code">
                        <img src="{qr_code_url}" alt="Your Event QR Code" />
                        <p><strong>QR Code ID:</strong> {qr_code_id}</p>
                    </div>
                    
                    <div class="info-box">
                        <h4>Important Information:</h4>
                        <ul>
                            <li>Save this QR code to your phone or print this email</li>
                            <li>Arrive 15 minutes early for check-in</li>
                            <li>Contact us if you have any questions</li>
                        </ul>
                    </div>
                    
                    <p>If you can't access your QR code, show your confirmation email and photo ID at check-in.</p>
                    
                    <div class="footer">
                        <p>Thank you for volunteering! We look forward to seeing you at the event.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """


# Global Gmail email sender instance
gmail_email_sender = GmailEmailSender()
