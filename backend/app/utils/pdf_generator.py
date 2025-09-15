"""PDF generation utilities for QR codes."""

import io
import requests
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.colors import black, blue, darkblue
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)


class PDFGenerator:
    """PDF generator for QR code tickets."""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()
    
    def _setup_custom_styles(self):
        """Setup custom styles for the PDF."""
        # Title style
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=darkblue
        )
        
        # Subtitle style
        self.subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=blue
        )
        
        # Info style
        self.info_style = ParagraphStyle(
            'CustomInfo',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=10,
            alignment=TA_LEFT
        )
        
        # Ticket info style
        self.ticket_style = ParagraphStyle(
            'TicketInfo',
            parent=self.styles['Normal'],
            fontSize=14,
            spaceAfter=15,
            alignment=TA_CENTER,
            textColor=black
        )
        
        # Terms and conditions style
        self.terms_style = ParagraphStyle(
            'TermsConditions',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            alignment=TA_LEFT,
            textColor=black,
            leftIndent=0,
            rightIndent=0
        )
        
        # Terms title style
        self.terms_title_style = ParagraphStyle(
            'TermsTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=darkblue
        )
    
    def _create_terms_and_conditions_page(self) -> List:
        """Create the terms and conditions page content."""
        terms_content = []
        
        # Add page break to start a new page
        terms_content.append(PageBreak())
        
        # Terms and conditions title
        terms_content.append(Paragraph("Terms and Conditions", self.terms_title_style))
        terms_content.append(Spacer(1, 0.3*inch))
        
        # Terms and conditions text
        terms_text = """
        <b>1.</b> No exchange or refund. Unauthorized sale of tickets is prohibited.<br/><br/>
        
        <b>2.</b> ISO reserves the right of admission and entry.<br/><br/>
        
        <b>3.</b> Consumption and possession of alcohol and narcotics are strictly prohibited.<br/><br/>
        
        <b>4.</b> Everyone must present the QR code received in their email at the time of the event to receive their wristbands.<br/><br/>
        
        <b>5.</b> Ticket holders voluntarily assume all risks in attending the event and release ISO-SJSU from all related claims.<br/><br/>
        
        <b>6.</b> By entering the venue, attendees consent to photography, video recording, and their use in promotional materials by ISO.<br/><br/>
        
        <b>7.</b> ISO-SJSU is not responsible for any food-related issues, including allergies, dietary restrictions, or adverse reactions to food. Attendees consume food and beverages at their own risk.<br/><br/>
        
        <b>8.</b> Ticket categories are final and cannot be changed or upgraded after purchase.<br/><br/>
        
        <b>9.</b> Weapons, sharp objects, outside food or drinks, professional cameras, drones, or any other dangerous items are strictly prohibited.<br/><br/>
        
        <b>10.</b> ISO-SJSU is not responsible for any lost, stolen, or damaged personal belongings.<br/><br/>
        
        <b>11.</b> Terms and conditions are subject to change at the discretion of ISO.
        """
        
        terms_content.append(Paragraph(terms_text, self.terms_style))
        
        return terms_content
    
    def generate_qr_tickets_pdf(self, qr_codes_data: List[Dict[str, Any]], event_name: str = "Volunteer Event 2024") -> bytes:
        """
        Generate a PDF with QR code tickets.
        
        Args:
            qr_codes_data: List of QR code data dictionaries
            event_name: Name of the event
            
        Returns:
            PDF bytes
        """
        try:
            # Create PDF in memory
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch, bottomMargin=1*inch)
            
            # Build PDF content
            story = []
            
            for i, qr_data in enumerate(qr_codes_data):
                # Add page break for subsequent tickets
                if i > 0:
                    story.append(Spacer(1, 0.5*inch))
                
                # Event title
                story.append(Paragraph(event_name, self.title_style))
                story.append(Spacer(1, 0.2*inch))
                
                # Ticket number
                ticket_text = f"Ticket {qr_data['ticket_number']} of {qr_data['total_tickets']}"
                story.append(Paragraph(ticket_text, self.subtitle_style))
                story.append(Spacer(1, 0.3*inch))
                
                # Download and add QR code image
                try:
                    qr_response = requests.get(qr_data['qr_code_url'], timeout=10)
                    if qr_response.status_code == 200:
                        qr_image = Image(io.BytesIO(qr_response.content))
                        qr_image.drawHeight = 3*inch
                        qr_image.drawWidth = 3*inch
                        story.append(qr_image)
                        story.append(Spacer(1, 0.2*inch))
                    else:
                        logger.error(f"Failed to download QR code: {qr_data['qr_code_url']}")
                        story.append(Paragraph("QR Code not available", self.info_style))
                except Exception as e:
                    logger.error(f"Error downloading QR code: {e}")
                    story.append(Paragraph("QR Code not available", self.info_style))
                
                # Attendee information
                story.append(Paragraph(f"<b>Name:</b> {qr_data['attendee_name']}", self.info_style))
                story.append(Paragraph(f"<b>Email:</b> {qr_data['attendee_email']}", self.info_style))
                story.append(Paragraph(f"<b>Phone:</b> {qr_data['attendee_phone']}", self.info_style))
                story.append(Paragraph(f"<b>Price per ticket:</b> ${qr_data['price_per_ticket']:.2f}", self.info_style))
                story.append(Spacer(1, 0.2*inch))
                
                # QR Code ID
                story.append(Paragraph(f"<b>QR Code ID:</b> {qr_data['qr_code_id']}", self.ticket_style))
                story.append(Spacer(1, 0.3*inch))
                
                # Instructions
                instructions = """
                <b>Instructions:</b><br/>
                • Present this QR code at the event entrance<br/>
                • Each QR code can only be used once<br/>
                • Keep this ticket safe until the event<br/>
                • Contact us if you have any questions
                """
                story.append(Paragraph(instructions, self.info_style))
                
                # Add page break for next ticket (except for the last one)
                if i < len(qr_codes_data) - 1:
                    story.append(Spacer(1, 0.5*inch))
            
            # Add terms and conditions page
            terms_content = self._create_terms_and_conditions_page()
            story.extend(terms_content)
            
            # Build PDF
            doc.build(story)
            
            # Get PDF bytes
            pdf_bytes = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Generated PDF with {len(qr_codes_data)} QR code tickets")
            return pdf_bytes
            
        except Exception as e:
            logger.error(f"Error generating PDF: {e}")
            raise
    
    def generate_single_ticket_pdf(self, qr_data: Dict[str, Any], event_name: str = "Volunteer Event 2024") -> bytes:
        """
        Generate a PDF for a single QR code ticket.
        
        Args:
            qr_data: QR code data dictionary
            event_name: Name of the event
            
        Returns:
            PDF bytes
        """
        return self.generate_qr_tickets_pdf([qr_data], event_name)


# Global PDF generator instance
pdf_generator = PDFGenerator()
