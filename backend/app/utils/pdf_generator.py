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
            fontSize=12,
            spaceAfter=15,
            alignment=TA_CENTER,
            textColor=black
        )
        
        # Terms and conditions style (smaller to fit on each page)
        self.terms_style = ParagraphStyle(
            'TermsConditions',
            parent=self.styles['Normal'],
            fontSize=8,
            spaceAfter=6,
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
    
    def _get_terms_paragraph(self) -> Paragraph:
        """Return a single terms and conditions paragraph to place on each page."""
        terms_text = (
            "<b>Terms:</b> No exchange/refund; unauthorized sale prohibited. "
            "ISO reserves right of admission. Alcohol/narcotics prohibited. "
            "Present QR from email to receive wristbands. Attendance at own risk; "
            "ISO-SJSU released from related claims. Entry implies consent to photo/video for ISO use. "
            "Food allergy/diet issues at attendee's risk. Ticket categories are final. "
            "Prohibited: weapons, sharp objects, outside food/drinks, pro cameras, drones, dangerous items. "
            "ISO-SJSU not responsible for lost/stolen/damaged belongings. Terms may change at ISO discretion."
        )
        return Paragraph(terms_text, self.terms_style)
    
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
                        # QR Code ID directly under QR image
                        story.append(Spacer(1, 0.15*inch))
                        story.append(Paragraph(f"<b>QR Code ID:</b> {qr_data['qr_code_id']}", self.ticket_style))
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

                # Terms on each page (small font)
                story.append(self._get_terms_paragraph())
                
                # Add page break for next ticket (except for the last one)
                if i < len(qr_codes_data) - 1:
                    story.append(Spacer(1, 0.5*inch))

            
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
