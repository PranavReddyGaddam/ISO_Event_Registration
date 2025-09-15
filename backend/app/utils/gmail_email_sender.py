"""Gmail API email integration utilities."""

import asyncio
import base64
from pathlib import Path
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional, List, Dict, Any
from app.config import settings
from app.utils.supabase_client import supabase_client
import logging
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from app.utils.pdf_generator import pdf_generator

logger = logging.getLogger(__name__)


class GmailEmailSender:
    """Gmail API email sender integration."""
    
    def __init__(self):
        """Initialize Gmail API email sender."""
        self.email = settings.gmail_email
        self.scopes = ["https://www.googleapis.com/auth/gmail.send"]
    
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
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Get current event details
            event_details = await self.get_current_event_details()
            
            # Create email content
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
    
    async def send_volunteer_signup_confirmation(self, email: str, name: str) -> bool:
        """Send volunteer signup confirmation email."""
        try:
            subject = f"Volunteer Application Received - {settings.event_name}"
            html_content = self.create_volunteer_signup_confirmation_content(name)
            
            success = await self._send_email(email, subject, html_content)
            
            if success:
                logger.info(f"Volunteer signup confirmation sent to: {email}")
            else:
                logger.error(f"Failed to send volunteer signup confirmation to: {email}")
            
            return success
                
        except Exception as e:
            logger.error(f"Error sending volunteer signup confirmation: {e}")
            return False
    
    async def send_volunteer_approval_email(
        self,
        email: str,
        name: str,
        temp_password: str
    ) -> bool:
        """Send volunteer approval email with login credentials."""
        try:
            subject = f"Volunteer Application Approved - {settings.event_name}"
            html_content = self.create_volunteer_approval_email_content(name, temp_password)
            
            success = await self._send_email(email, subject, html_content)
            
            if success:
                logger.info(f"Volunteer approval email sent to: {email}")
            else:
                logger.error(f"Failed to send volunteer approval email to: {email}")
            
            return success
                
        except Exception as e:
            logger.error(f"Error sending volunteer approval email: {e}")
            return False
    
    async def send_volunteer_rejection_email(
        self,
        email: str,
        name: str,
        rejection_reason: str
    ) -> bool:
        """Send volunteer rejection email."""
        try:
            subject = f"Volunteer Application Update - {settings.event_name}"
            html_content = self.create_volunteer_rejection_email_content(name, rejection_reason)
            
            success = await self._send_email(email, subject, html_content)
            
            if success:
                logger.info(f"Volunteer rejection email sent to: {email}")
            else:
                logger.error(f"Failed to send volunteer rejection email to: {email}")
            
            return success
                
        except Exception as e:
            logger.error(f"Error sending volunteer rejection email: {e}")
            return False
    
    async def send_registration_email_with_pdf(
        self,
        email: str,
        name: str,
        qr_codes_data: List[Dict[str, Any]],
        total_price: float
    ) -> bool:
        """Send registration email with PDF attachment containing QR codes."""
        try:
            # Generate PDF
            # Get current event details
            event_details = await self.get_current_event_details()
            pdf_bytes = pdf_generator.generate_qr_tickets_pdf(qr_codes_data, event_details['name'])
            
            # Create email content
            subject = f"Welcome to {event_details['name']} - Your QR Code Tickets Inside!"
            html_content = self.create_registration_email_with_pdf_content(name, len(qr_codes_data), total_price, event_details)
            
            # Send email with PDF attachment
            success = await self._send_email_with_attachment(email, subject, html_content, pdf_bytes, f"{name}_tickets.pdf")
            
            if success:
                logger.info(f"Registration email with PDF sent to: {email}")
            else:
                logger.error(f"Failed to send registration email with PDF to: {email}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error sending registration email with PDF: {e}")
            return False
    
    async def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using Gmail API (uses token.json)."""
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
    
    async def _send_email_with_attachment(self, to_email: str, subject: str, html_content: str, attachment_bytes: bytes, attachment_filename: str) -> bool:
        """Send email with attachment using Gmail API."""
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                self._send_email_with_attachment_sync,
                to_email,
                subject,
                html_content,
                attachment_bytes,
                attachment_filename,
            )
        except Exception as e:
            logger.error(f"Error in async email sending with attachment: {e}")
            return False

    def _send_email_sync(self, to_email: str, subject: str, html_content: str) -> bool:
        try:
            logger.info(f"Starting Gmail API email send to: {to_email}")
            
            # Resolve token.json relative to the backend directory
            utils_dir = Path(__file__).resolve().parent
            backend_root = utils_dir.parents[1]  # .../backend
            token_path = backend_root / "token.json"
            logger.info(f"Looking for token.json at: {token_path}")
            
            if not token_path.exists():
                raise FileNotFoundError(f"token.json not found at {token_path}")
            
            logger.info("Loading credentials from token.json")
            creds = Credentials.from_authorized_user_file(str(token_path), self.scopes)
            
            logger.info("Building Gmail service")
            service = build("gmail", "v1", credentials=creds)
            
            logger.info("Creating email message")
            message = MIMEText(html_content, "html", "utf-8")
            message["to"] = to_email
            message["subject"] = subject
            
            logger.info("Encoding message")
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            
            logger.info("Sending email via Gmail API")
            service.users().messages().send(userId="me", body={"raw": raw}).execute()
            
            logger.info(f"Email sent successfully to: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail API send error: {e}")
            logger.exception("Full traceback:")
            return False
    
    def _send_email_with_attachment_sync(self, to_email: str, subject: str, html_content: str, attachment_bytes: bytes, attachment_filename: str) -> bool:
        try:
            logger.info(f"Starting Gmail API email send with attachment to: {to_email}")
            
            # Resolve token.json relative to the backend directory
            utils_dir = Path(__file__).resolve().parent
            backend_root = utils_dir.parents[1]  # .../backend
            token_path = backend_root / "token.json"
            logger.info(f"Looking for token.json at: {token_path}")
            
            if not token_path.exists():
                raise FileNotFoundError(f"token.json not found at {token_path}")
            
            logger.info("Loading credentials from token.json")
            creds = Credentials.from_authorized_user_file(str(token_path), self.scopes)
            
            logger.info("Building Gmail service")
            service = build("gmail", "v1", credentials=creds)
            
            logger.info("Creating email message with attachment")
            
            # Create multipart message
            message = MIMEMultipart()
            message["to"] = to_email
            message["subject"] = subject
            
            # Add HTML content
            html_part = MIMEText(html_content, "html", "utf-8")
            message.attach(html_part)
            
            # Add PDF attachment
            pdf_part = MIMEApplication(attachment_bytes, _subtype='pdf')
            pdf_part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
            message.attach(pdf_part)
            
            logger.info("Encoding message")
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            
            logger.info("Sending email via Gmail API")
            service.users().messages().send(userId="me", body={"raw": raw}).execute()
            
            logger.info(f"Email with attachment sent successfully to: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Gmail API send error with attachment: {e}")
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
                    
                    <div class="info-box">
                        <h4>Terms and Conditions:</h4>
                        <ul style="font-size: 12px; line-height: 1.4;">
                            <li>No exchange or refund. Unauthorized sale of tickets is prohibited.</li>
                            <li>ISO reserves the right of admission and entry.</li>
                            <li>Consumption and possession of alcohol and narcotics are strictly prohibited.</li>
                            <li>Everyone must present the QR code received in their email at the time of the event to receive their wristbands.</li>
                            <li>Ticket holders voluntarily assume all risks in attending the event and release ISO-SJSU from all related claims.</li>
                            <li>By entering the venue, attendees consent to photography, video recording, and their use in promotional materials by ISO.</li>
                            <li>ISO-SJSU is not responsible for any food-related issues, including allergies, dietary restrictions, or adverse reactions to food. Attendees consume food and beverages at their own risk.</li>
                            <li>Ticket categories are final and cannot be changed or upgraded after purchase.</li>
                            <li>Weapons, sharp objects, outside food or drinks, professional cameras, drones, or any other dangerous items are strictly prohibited.</li>
                            <li>ISO-SJSU is not responsible for any lost, stolen, or damaged personal belongings.</li>
                            <li>Terms and conditions are subject to change at the discretion of ISO.</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>Thank you for volunteering! We look forward to seeing you at the event.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_volunteer_signup_confirmation_content(self, name: str) -> str:
        """Create HTML email content for volunteer signup confirmation."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Volunteer Application Received</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3b82f6; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
                .status-box {{ background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Application Received!</h1>
                    <p>Thank you for your volunteer application</p>
                </div>
                <div class="content">
                    <h2>Hi {name},</h2>
                    <p>Thank you for your interest in volunteering for <strong>{settings.event_name}</strong>!</p>
                    
                    <div class="status-box">
                        <h3>📋 Application Status: Pending Review</h3>
                        <p>Your volunteer application has been successfully submitted and is now under review.</p>
                    </div>
                    
                    <div class="info-box">
                        <h4>What happens next?</h4>
                        <ol>
                            <li><strong>Review Process:</strong> Our team will review your application</li>
                            <li><strong>Decision Notification:</strong> You'll receive an email with our decision</li>
                            <li><strong>If Approved:</strong> You'll get login credentials to access volunteer features</li>
                            <li><strong>If Not Approved:</strong> We'll provide feedback and next steps</li>
                        </ol>
                    </div>
                    
                    <p><strong>Review Timeline:</strong> We typically review applications within 2-3 business days.</p>
                    
                    <p>If you have any questions about your application or the volunteer program, please don't hesitate to contact us.</p>
                    
                    <div class="footer">
                        <p>Thank you for your interest in supporting our event!</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_volunteer_approval_email_content(self, name: str, temp_password: str) -> str:
        """Create HTML email content for volunteer approval."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Volunteer Application Approved</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .credentials {{ background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Congratulations!</h1>
                    <p>Your volunteer application has been approved!</p>
                </div>
                <div class="content">
                    <h2>Hi {name},</h2>
                    <p>Great news! Your volunteer application for <strong>{settings.event_name}</strong> has been approved.</p>
                    
                    <div class="credentials">
                        <h3>🔑 Your Login Credentials</h3>
                        <p><strong>Email:</strong> Your registered email address</p>
                        <p><strong>Temporary Password:</strong> <code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{temp_password}</code></p>
                        <p><em>Please change this password after your first login for security.</em></p>
                    </div>
                    
                    <div class="info-box">
                        <h4>Next Steps:</h4>
                        <ol>
                            <li>Log in to the volunteer portal using your credentials above</li>
                            <li>Change your temporary password to something secure</li>
                            <li>Explore the volunteer features and get ready for the event!</li>
                        </ol>
                    </div>
                    
                    <p>You now have access to volunteer features including:</p>
                    <ul>
                        <li>Event check-in management</li>
                        <li>Attendee registration assistance</li>
                        <li>Event coordination tools</li>
                    </ul>
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                    
                    <div class="footer">
                        <p>Welcome to the team! We're excited to work with you.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_volunteer_rejection_email_content(self, name: str, rejection_reason: str) -> str:
        """Create HTML email content for volunteer rejection."""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Volunteer Application Update</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #f59e0b; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .reason-box {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Volunteer Application Update</h1>
                    <p>Thank you for your interest in volunteering</p>
                </div>
                <div class="content">
                    <h2>Hi {name},</h2>
                    <p>Thank you for your interest in volunteering for <strong>{settings.event_name}</strong>.</p>
                    
                    <p>After careful consideration, we regret to inform you that we are unable to approve your volunteer application at this time.</p>
                    
                    <div class="reason-box">
                        <h4>Reason:</h4>
                        <p>{rejection_reason}</p>
                    </div>
                    
                    <div class="info-box">
                        <h4>What's Next?</h4>
                        <ul>
                            <li>You can reapply for future events</li>
                            <li>Consider attending as a regular participant</li>
                            <li>Stay connected for future volunteer opportunities</li>
                        </ul>
                    </div>
                    
                    <p>We appreciate your interest in supporting our event and hope you'll consider joining us as an attendee.</p>
                    
                    <p>If you have any questions about this decision, please feel free to contact us.</p>
                    
                    <div class="footer">
                        <p>Thank you for your understanding and continued support.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
    
    def create_registration_email_with_pdf_content(self, name: str, ticket_count: int, total_price: float, event_details: Dict[str, str] = None) -> str:
        """Create HTML email content for registration confirmation with PDF attachment."""
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
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
                .pdf-box {{ background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }}
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
                        <p><strong>Number of Tickets:</strong> {ticket_count}</p>
                        <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                    </div>
                    
                    <div class="pdf-box">
                        <h3>📄 Your QR Code Tickets</h3>
                        <p>Your QR code tickets have been attached to this email as a PDF file.</p>
                        <p><strong>Please download and print the PDF</strong> to bring with you to the event.</p>
                        <p>Each ticket contains a unique QR code that will be scanned at check-in.</p>
                    </div>
                    
                    <div class="info-box">
                        <h4>Important Information:</h4>
                        <ul>
                            <li>Download and print the attached PDF file</li>
                            <li>Each QR code can only be used once</li>
                            <li>Arrive 15 minutes early for check-in</li>
                            <li>Bring a photo ID along with your printed tickets</li>
                            <li>Contact us if you have any questions</li>
                        </ul>
                    </div>
                    
                    <p>If you can't access the PDF attachment, please contact us immediately.</p>
                    
                    <div class="info-box">
                        <h4>Terms and Conditions:</h4>
                        <ul style="font-size: 12px; line-height: 1.4;">
                            <li>No exchange or refund. Unauthorized sale of tickets is prohibited.</li>
                            <li>ISO reserves the right of admission and entry.</li>
                            <li>Consumption and possession of alcohol and narcotics are strictly prohibited.</li>
                            <li>Everyone must present the QR code received in their email at the time of the event to receive their wristbands.</li>
                            <li>Ticket holders voluntarily assume all risks in attending the event and release ISO-SJSU from all related claims.</li>
                            <li>By entering the venue, attendees consent to photography, video recording, and their use in promotional materials by ISO.</li>
                            <li>ISO-SJSU is not responsible for any food-related issues, including allergies, dietary restrictions, or adverse reactions to food. Attendees consume food and beverages at their own risk.</li>
                            <li>Ticket categories are final and cannot be changed or upgraded after purchase.</li>
                            <li>Weapons, sharp objects, outside food or drinks, professional cameras, drones, or any other dangerous items are strictly prohibited.</li>
                            <li>ISO-SJSU is not responsible for any lost, stolen, or damaged personal belongings.</li>
                            <li>Terms and conditions are subject to change at the discretion of ISO.</li>
                        </ul>
                    </div>
                    
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
