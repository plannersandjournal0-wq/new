import fitz  # PyMuPDF
import re
from pathlib import Path
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class PDFFiller:
    """Handles filling PDF form fields with customer data"""
    
    @staticmethod
    async def fill_pdf_fields(
        template_path: str,
        field_mappings: List[Dict],
        customer_data: Dict,
        output_path: str
    ) -> str:
        """
        Fill PDF form fields based on field mappings and customer data.
        Uses widget.update() which reliably renders text with fallback fonts.
        
        Args:
            template_path: Path to the base template PDF
            field_mappings: List of {pdfFieldName, variableType, fallbackValue}
            customer_data: Dict with requestedName, buyerFullName, etc.
            output_path: Where to save the personalized PDF
            
        Returns:
            Path to the filled PDF
        """
        try:
            logger.info(f"Starting PDF fill: {template_path} -> {output_path}")
            doc = fitz.open(template_path)
            filled_fields = []

            for mapping in field_mappings:
                pdf_field_name = mapping.get("pdfFieldName")
                variable_type = mapping.get("variableType")
                fallback_value = mapping.get("fallbackValue", "")

                # Get the value to fill based on variable type
                fill_value = None
                if variable_type == "requestedName":
                    fill_value = customer_data.get("requestedName")
                # Future: Add more variable types
                
                if not fill_value:
                    fill_value = fallback_value
                if not fill_value:
                    logger.warning(f"No value for field '{pdf_field_name}'")
                    continue

                filled = False
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    for widget in page.widgets():
                        if widget.field_name != pdf_field_name:
                            continue

                        # Fill the field using widget.update() for reliable rendering
                        # This uses Helvetica as fallback but guarantees visible text
                        widget.field_value = fill_value
                        widget.text_fontsize = 0  # Auto-fit to field size
                        widget.update()
                        
                        filled = True
                        logger.info(
                            f"Filled '{pdf_field_name}' on page {page_num+1} "
                            f"with value: '{fill_value}'"
                        )

                if filled:
                    filled_fields.append({"fieldName": pdf_field_name, "value": fill_value})
                else:
                    logger.warning(f"Field '{pdf_field_name}' not found in PDF")

            # Save with garbage collection to clean up unused objects
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_NONE, garbage=4)
            doc.close()

            logger.info(f"PDF fill complete. Filled {len(filled_fields)} field(s)")
            return output_path

        except Exception as e:
            logger.error(f"Error filling PDF: {str(e)}")
            raise Exception(f"Failed to fill PDF fields: {str(e)}")
    
    @staticmethod
    async def validate_pdf_fillable(pdf_path: str) -> bool:
        """
        Check if a PDF has fillable form fields.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            True if PDF has fillable fields
        """
        try:
            doc = fitz.open(pdf_path)
            
            has_fields = False
            for page_num in range(len(doc)):
                page = doc[page_num]
                if page.widgets():
                    has_fields = True
                    break
            
            doc.close()
            return has_fields
            
        except Exception as e:
            logger.error(f"Error validating PDF: {str(e)}")
            return False
