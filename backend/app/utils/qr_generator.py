"""QR code generation utilities."""

import qrcode
import io
import uuid
from typing import Tuple
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
import logging

logger = logging.getLogger(__name__)


class QRCodeGenerator:
    """QR code generator with customizable styling."""
    
    def __init__(self):
        """Initialize QR code generator."""
        self.qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=4,
        )
    
    def generate_qr_code_id(self) -> str:
        """Generate a unique QR code ID."""
        return str(uuid.uuid4())
    
    def create_qr_code(self, qr_code_id: str, attendee_name: str) -> Tuple[str, bytes]:
        """
        Create a QR code for an attendee.
        
        Args:
            qr_code_id: Unique identifier for the QR code
            attendee_name: Name of the attendee for the QR code data
        
        Returns:
            Tuple of (qr_code_id, qr_code_image_bytes)
        """
        try:
            # Create QR code data (just the QR code ID for simplicity)
            qr_data = qr_code_id
            
            # Clear previous data
            self.qr.clear()
            
            # Add data to QR code
            self.qr.add_data(qr_data)
            self.qr.make(fit=True)
            
            # Create image with styling
            img = self.qr.make_image(
                image_factory=StyledPilImage,
                module_drawer=RoundedModuleDrawer(),
                fill_color="black",
                back_color="white"
            )
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            logger.info(f"QR code generated for attendee: {attendee_name}")
            return qr_code_id, img_bytes
            
        except Exception as e:
            logger.error(f"Error generating QR code: {e}")
            raise
    
    def create_event_qr_code(self, event_data: str) -> bytes:
        """
        Create a QR code for event information.
        
        Args:
            event_data: Event information to encode
        
        Returns:
            QR code image bytes
        """
        try:
            # Clear previous data
            self.qr.clear()
            
            # Add event data
            self.qr.add_data(event_data)
            self.qr.make(fit=True)
            
            # Create basic image
            img = self.qr.make_image(fill_color="black", back_color="white")
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            return img_bytes
            
        except Exception as e:
            logger.error(f"Error generating event QR code: {e}")
            raise


# Global QR code generator instance
qr_generator = QRCodeGenerator()
