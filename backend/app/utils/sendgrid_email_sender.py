"""Minimal SendGrid sender (not wired yet). Safe to keep alongside Gmail code."""

from typing import Optional, Tuple
import logging
import asyncio
import base64

from app.config import settings
from app.utils.supabase_client import supabase_client
from app.utils.pdf_generator import pdf_generator


logger = logging.getLogger(__name__)


def _get_sendgrid_classes() -> Tuple[object, object, object, object, object, object, object, object]:
    try:
        from sendgrid import SendGridAPIClient  # type: ignore
        from sendgrid.helpers.mail import (  # type: ignore
            Mail,
            Email,
            To,
            Attachment,
            FileContent,
            FileName,
            FileType,
            Disposition,
        )
        return (
            SendGridAPIClient,
            Mail,
            Email,
            To,
            Attachment,
            FileContent,
            FileName,
            FileType,
            Disposition,
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("SendGrid SDK not available: %s", exc)
        return (None, None, None, None, None, None, None, None)


class MinimalSendGridSender:
    """Very small helper to send a basic HTML email via SendGrid.

    Not imported anywhere yet. Use later behind a feature flag.
    """

    def __init__(self, from_email: Optional[str] = None, reply_to: Optional[str] = None):
        self.from_email = from_email
        self.reply_to = reply_to

    def send_html(self, to_email: str, subject: str, html_content: str) -> bool:
        (
            SendGridAPIClient,
            Mail,
            Email,
            To,
            Attachment,
            FileContent,
            FileName,
            FileType,
            Disposition,
        ) = _get_sendgrid_classes()
        if not all([SendGridAPIClient, Mail, Email, To]):
            return False

        try:
            message = Mail(
                from_email=Email(self.from_email) if self.from_email else None,
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content,
            )
            if self.reply_to:
                message.reply_to = Email(self.reply_to)

            client = SendGridAPIClient()
            response = client.send(message)
            logger.info("SendGrid sent status=%s", getattr(response, "status_code", None))
            return int(getattr(response, "status_code", 0)) in (200, 202)
        except Exception as exc:
            logger.error("SendGrid send error: %s", exc)
            return False

    async def get_current_event_details(self) -> dict:
        try:
            current_event = await supabase_client.get_current_event()
            if current_event:
                return {
                    "name": current_event.get("name", settings.event_name),
                    "date": current_event.get("event_date", settings.event_date),
                    "location": current_event.get("location", "TBD"),
                }
        except Exception as e:
            logger.error(f"Error getting current event details: {e}")
        return {"name": settings.event_name, "date": settings.event_date, "location": "TBD"}

    async def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.send_html, to_email, subject, html_content)

    async def _send_email_with_pdf(self, to_email: str, subject: str, html_content: str, pdf_bytes: bytes, filename: str) -> bool:
        (
            SendGridAPIClient,
            Mail,
            Email,
            To,
            Attachment,
            FileContent,
            FileName,
            FileType,
            Disposition,
        ) = _get_sendgrid_classes()
        if not all([SendGridAPIClient, Mail, Email, To, Attachment]):
            return False

        try:
            message = Mail(
                from_email=Email(self.from_email) if self.from_email else None,
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content,
            )
            if self.reply_to:
                message.reply_to = Email(self.reply_to)

            encoded = base64.b64encode(pdf_bytes).decode("utf-8")
            message.attachment = Attachment(
                FileContent(encoded),
                FileName(filename),
                FileType("application/pdf"),
                Disposition("attachment"),
            )

            client = SendGridAPIClient()
            response = client.send(message)
            logger.info("SendGrid sent (pdf) status=%s", getattr(response, "status_code", None))
            return int(getattr(response, "status_code", 0)) in (200, 202)
        except Exception as exc:
            logger.error("SendGrid send error (pdf): %s", exc)
            return False

    # Public API matching Gmail sender
    async def send_checkin_confirmation(self, email: str, name: str) -> bool:
        details = await self.get_current_event_details()
        subject = f"Check-in Confirmed - {details['name']}"
        html = f"""
        <html><body><div style=\"font-family: Arial\"><h2>Hi {name},</h2>
        <p>Your check-in for <strong>{details['name']}</strong> has been confirmed.</p>
        </div></body></html>
        """
        return await self._send_email(email, subject, html)

    async def send_volunteer_signup_confirmation(self, email: str, name: str) -> bool:
        subject = f"Volunteer Application Received - {settings.event_name}"
        html = f"<html><body><h2>Hi {name},</h2><p>We received your volunteer application.</p></body></html>"
        return await self._send_email(email, subject, html)

    async def send_volunteer_approval_email(self, email: str, name: str, temp_password: str) -> bool:
        subject = f"Volunteer Application Approved - {settings.event_name}"
        html = f"<html><body><h2>Hi {name},</h2><p>Your application was approved.</p><p>Temporary password: {temp_password}</p></body></html>"
        return await self._send_email(email, subject, html)

    async def send_volunteer_rejection_email(self, email: str, name: str, rejection_reason: str) -> bool:
        subject = f"Volunteer Application Update - {settings.event_name}"
        html = f"<html><body><h2>Hi {name},</h2><p>We are unable to approve your application.</p><p>Reason: {rejection_reason}</p></body></html>"
        return await self._send_email(email, subject, html)

    async def send_registration_email(self, email: str, name: str, qr_code_url: str, qr_code_id: str, ticket_quantity: int = 1, total_price: float = 0.0) -> bool:
        details = await self.get_current_event_details()
        subject = f"Welcome to {details['name']} - Your QR Code Inside!"
        html = self.create_registration_email_content(
            name=name,
            qr_code_url=qr_code_url,
            qr_code_id=qr_code_id,
            ticket_quantity=ticket_quantity,
            total_price=total_price,
            event_details=details,
        )
        return await self._send_email(email, subject, html)

    async def send_registration_email_with_pdf(self, email: str, name: str, qr_codes_data: list, total_price: float) -> bool:
        details = await self.get_current_event_details()
        subject = f"Welcome to {details['name']} - Your QR Code Tickets Inside!"
        html = self.create_registration_email_with_pdf_content(
            name=name,
            ticket_count=len(qr_codes_data),
            total_price=total_price,
            event_details=details,
        )
        # Generate PDF attachment like Gmail flow
        pdf_bytes = pdf_generator.generate_qr_tickets_pdf(qr_codes_data, details['name'])
        return await self._send_email_with_pdf(
            to_email=email,
            subject=subject,
            html_content=html,
            pdf_bytes=pdf_bytes,
            filename=f"{name}_tickets.pdf",
        )

    # -------- Rich HTML builders (mirroring Gmail templates) --------
    def create_registration_email_content(
        self,
        name: str,
        qr_code_url: str,
        qr_code_id: str,
        ticket_quantity: int = 1,
        total_price: float = 0.0,
        event_details: dict | None = None,
    ) -> str:
        if event_details is None:
            event_details = {
                "name": settings.event_name,
                "date": settings.event_date,
                "location": "TBD",
            }
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"utf-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Welcome to {event_details['name']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: transparent; color: inherit; padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: hidden; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .qr-code {{ text-align: center; margin: 30px 0; }}
                .qr-code img {{ max-width: 200px; height: auto; border: 2px solid #e5e7eb; border-radius: 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class=\"container\">
                <div class=\"header\">
                    <img src=\"https://gbvitfwoieyzhozfndkn.supabase.co/storage/v1/object/public/email-assets/email_poster.png\" alt=\"Event Banner\" style=\"display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;\">
                </div>
                <div class=\"content\">
                    <h2>Your Registration is Confirmed!</h2>
                    <p>We're excited to have you join us for {event_details['name']} on {event_details['date']}.</p>
                    <div class=\"info-box\">
                        <h4>Ticket Information:</h4>
                        <p><strong>Number of Tickets:</strong> {ticket_quantity}</p>
                        <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                    </div>
                    <div class=\"qr-code\">
                        <img src=\"{qr_code_url}\" alt=\"QR Code\" />
                        <p style=\"font-size:12px;color:#6b7280\">{qr_code_id}</p>
                    </div>
                    <div class=\"info-box\">
                        <h4>Important Information:</h4>
                        <ul>
                            <li>Save this QR code to your phone or print this email</li>
                            <li>Arrive 15 minutes early for check-in</li>
                            <li>Contact us if you have any questions</li>
                        </ul>
                    </div>
                    <div class=\"footer\">
                        <p>Thank you for volunteering! We look forward to seeing you at the event.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    def create_registration_email_with_pdf_content(
        self,
        name: str,
        ticket_count: int,
        total_price: float,
        event_details: dict | None = None,
    ) -> str:
        if event_details is None:
            event_details = {
                "name": settings.event_name,
                "date": settings.event_date,
                "location": "TBD",
            }
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset=\"utf-8\">
            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
            <title>Welcome to {event_details['name']}</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: transparent; color: inherit; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
                .footer {{ text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }}
                .info-box {{ background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }}
                .pdf-box {{ background-color: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class=\"container\">
                <div class=\"header\">
                    <img src=\"https://gbvitfwoieyzhozfndkn.supabase.co/storage/v1/object/public/email-assets/email_poster.png\" alt=\"Event Banner\" style=\"display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;\">
                </div>
                <div class=\"content\">
                    <h2>Your Registration is Confirmed!</h2>
                    <p>We're excited to have you join us for {event_details['name']} on 18th October 2025 5:00 PM.</p>
                    <div class=\"info-box\">
                        <h4>Ticket Information:</h4>
                        <p><strong>Number of Tickets:</strong> {ticket_count}</p>
                        <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                    </div>
                    <div class=\"pdf-box\">
                        <h3>📄 Your QR Code Tickets</h3>
                        <p>Your QR code tickets have been attached to this email as a PDF file.</p>
                        <p>Each ticket contains a unique QR code that will be scanned at check-in.</p>
                    </div>
                    <p>If you can't access the PDF attachment, please contact us immediately.</p>
                    <div class=\"info-box\">
                        <h4>Terms and Conditions:</h4>
                        <ul style=\"font-size: 12px; line-height: 1.4;\">
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
                    <div class=\"footer\">
                        <p>Thank you for volunteering! We look forward to seeing you at the event.</p>
                        <p><em>This is an automated message. Please do not reply to this email.</em></p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

"""SendGrid email integration utilities (replacement for Gmail senders)."""

import asyncio
import base64
from typing import List, Dict, Any
import logging

from app.config import settings
from app.utils.supabase_client import supabase_client
from app.utils.pdf_generator import pdf_generator

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Email,
    To,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
)


logger = logging.getLogger(__name__)


class SendGridEmailSender:
    """SendGrid email sender with the same interface as GmailEmailSender."""

    def __init__(self):
        self.from_email = settings.sendgrid_from_email or settings.gmail_email

    async def get_current_event_details(self) -> Dict[str, str]:
        try:
            current_event = await supabase_client.get_current_event()
            if current_event:
                return {
                    "name": current_event.get("name", settings.event_name),
                    "date": current_event.get("event_date", settings.event_date),
                    "location": current_event.get("location", "TBD"),
                }
        except Exception as e:
            logger.error(f"Error getting current event details: {e}")

        return {
            "name": settings.event_name,
            "date": settings.event_date,
            "location": "TBD",
        }

    async def send_registration_email(
        self,
        email: str,
        name: str,
        qr_code_url: str,
        qr_code_id: str,
        ticket_quantity: int = 1,
        total_price: float = 0.0,
    ) -> bool:
        try:
            event_details = await self.get_current_event_details()
            subject = f"Welcome to {event_details['name']} - Your QR Code Inside!"
            html_content = self.create_registration_email_content(
                name, qr_code_url, qr_code_id, ticket_quantity, total_price, event_details
            )
            return await self._send_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending registration email: {e}")
            return False

    async def send_checkin_confirmation(self, email: str, name: str) -> bool:
        try:
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
            return await self._send_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending check-in confirmation: {e}")
            return False

    async def send_volunteer_signup_confirmation(self, email: str, name: str) -> bool:
        try:
            subject = f"Volunteer Application Received - {settings.event_name}"
            html_content = self.create_volunteer_signup_confirmation_content(name)
            return await self._send_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending volunteer signup confirmation: {e}")
            return False

    async def send_volunteer_approval_email(
        self, email: str, name: str, temp_password: str
    ) -> bool:
        try:
            subject = f"Volunteer Application Approved - {settings.event_name}"
            html_content = self.create_volunteer_approval_email_content(name, temp_password)
            return await self._send_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending volunteer approval email: {e}")
            return False

    async def send_volunteer_rejection_email(
        self, email: str, name: str, rejection_reason: str
    ) -> bool:
        try:
            subject = f"Volunteer Application Update - {settings.event_name}"
            html_content = self.create_volunteer_rejection_email_content(name, rejection_reason)
            return await self._send_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Error sending volunteer rejection email: {e}")
            return False

    async def send_registration_email_with_pdf(
        self,
        email: str,
        name: str,
        qr_codes_data: List[Dict[str, Any]],
        total_price: float,
    ) -> bool:
        try:
            event_details = await self.get_current_event_details()
            pdf_bytes = pdf_generator.generate_qr_tickets_pdf(qr_codes_data, event_details['name'])
            subject = f"Welcome to {event_details['name']} - Your QR Code Tickets Inside!"
            html_content = self.create_registration_email_with_pdf_content(name, len(qr_codes_data), total_price, event_details)
            return await self._send_email_with_attachment(
                email, subject, html_content, pdf_bytes, f"{name}_tickets.pdf"
            )
        except Exception as e:
            logger.error(f"Error sending registration email with PDF: {e}")
            return False

    async def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        try:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None, self._send_email_sync, to_email, subject, html_content
            )
        except Exception as e:
            logger.error(f"Error in async email sending: {e}")
            return False

    def _send_email_sync(self, to_email: str, subject: str, html_content: str) -> bool:
        try:
            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content,
            )
            if settings.sendgrid_reply_to_email:
                message.reply_to = Email(settings.sendgrid_reply_to_email)
            sg = SendGridAPIClient()
            response = sg.send(message)
            logger.info(f"SendGrid email sent to {to_email} status={response.status_code}")
            return int(getattr(response, "status_code", 0)) in (200, 202)
        except Exception as e:
            logger.error(f"SendGrid send error: {e}")
            return False

    async def _send_email_with_attachment(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachment_bytes: bytes,
        attachment_filename: str,
    ) -> bool:
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

    def _send_email_with_attachment_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachment_bytes: bytes,
        attachment_filename: str,
    ) -> bool:
        try:
            message = Mail(
                from_email=Email(self.from_email),
                to_emails=To(to_email),
                subject=subject,
                html_content=html_content,
            )
            if settings.sendgrid_reply_to_email:
                message.reply_to = Email(settings.sendgrid_reply_to_email)

            encoded = base64.b64encode(attachment_bytes).decode("utf-8")
            attachment = Attachment(
                FileContent(encoded),
                FileName(attachment_filename),
                FileType("application/pdf"),
                Disposition("attachment"),
            )
            message.attachment = attachment

            sg = SendGridAPIClient()
            response = sg.send(message)
            logger.info(
                f"SendGrid email with attachment sent to {to_email} status={response.status_code}"
            )
            return int(getattr(response, "status_code", 0)) in (200, 202)
        except Exception as e:
            logger.error(f"SendGrid send error with attachment: {e}")
            return False

    # ------- HTML content builders (copied to avoid Gmail dependency) -------
    def create_registration_email_content(
        self,
        name: str,
        qr_code_url: str,
        qr_code_id: str,
        ticket_quantity: int = 1,
        total_price: float = 0.0,
        event_details: Dict[str, str] = None,
    ) -> str:
        if event_details is None:
            event_details = {
                "name": settings.event_name,
                "date": settings.event_date,
                "location": "TBD",
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
                .header {{ background-color: #3b82f6; color: white; padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: hidden; }}
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
                    <img src="https://gbvitfwoieyzhozfndkn.supabase.co/storage/v1/object/public/email-assets/email_poster.png" alt="Event Banner" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;">
                </div>
                <div class="content">
                    <h2>Your Registration is Confirmed!</h2>
                    <p>We're excited to have you join us for {event_details['name']} on 10/18/2025.</p>
                    <div class="info-box">
                        <h4>Ticket Information:</h4>
                        <p><strong>Number of Tickets:</strong> {ticket_quantity}</p>
                        <p><strong>Total Amount:</strong> ${total_price:.2f}</p>
                    </div>
                    <h3>Your QR Code/s have been attached to this email as a PDF</h3>
                    <p>Please save this PDF and bring it with you to the event for quick check-in:</p>
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
                .header {{ background-color: #3b82f6; color: white; padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: hidden; }}
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

    def create_registration_email_with_pdf_content(
        self, name: str, ticket_count: int, total_price: float, event_details: Dict[str, str] = None
    ) -> str:
        if event_details is None:
            event_details = {
                "name": settings.event_name,
                "date": settings.event_date,
                "location": "TBD",
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
                    <img src="https://gbvitfwoieyzhozfndkn.supabase.co/storage/v1/object/public/email-assets/email_poster.png" alt="Event Banner" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;">
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
                        <p>Each ticket contains a unique QR code that will be scanned at check-in.</p>
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


# Global SendGrid email sender instance
sendgrid_email_sender = SendGridEmailSender()



