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
        Preserves original font by working with appearance streams directly.
        
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

                        # Get the widget's xref to access raw PDF object
                        xref = widget.xref

                        # Read the existing normal appearance stream (/N)
                        # This contains the ACTUAL font reference used in the original design
                        try:
                            ap_xref = None
                            widget_obj = doc.xref_object(xref)

                            # Find /AP reference - can be direct or nested
                            # Try direct reference first: /AP 36 0 R
                            ap_match = re.search(r'/AP\s+(\d+)\s+0\s+R', widget_obj)
                            if ap_match:
                                ap_dict_xref = int(ap_match.group(1))
                                # Check if this is the /N stream directly or an AP dictionary
                                ap_dict_obj = doc.xref_object(ap_dict_xref)
                                # Look for /N reference in AP dict
                                n_match = re.search(r'/N\s+(\d+)\s+0\s+R', ap_dict_obj)
                                if n_match:
                                    ap_xref = int(n_match.group(1))
                                else:
                                    # The reference itself might be the /N stream
                                    ap_xref = ap_dict_xref
                            
                            # Fallback: try nested format /AP << /N 123 0 R >>
                            if not ap_xref:
                                ap_match = re.search(r'/AP\s*<<[^>]*/N\s+(\d+)\s+0\s+R', widget_obj)
                                if ap_match:
                                    ap_xref = int(ap_match.group(1))

                            if ap_xref:
                                # Read original appearance stream
                                logger.info(f"Reading AP stream from xref {ap_xref} for field '{pdf_field_name}'")
                                orig_stream = doc.xref_stream(ap_xref)
                                orig_stream_str = orig_stream.decode("latin-1", errors="replace")
                                logger.info(f"AP stream content (first 200 chars): {orig_stream_str[:200]}")

                                # Extract font size from Tf instruction (e.g. /F1 35 Tf or /AbroSans-Thin.ttf 35 Tf)
                                tf_match = re.search(r'(/[\w.-]+)\s+([\d.]+)\s+Tf', orig_stream_str)
                                if tf_match:
                                    font_ref = tf_match.group(1)   # e.g. /F1 or /AbroSans-Thin.ttf
                                    font_size = tf_match.group(2)  # e.g. 35

                                    logger.info(f"Extracted font: {font_ref}, size: {font_size}")

                                    # Extract color (e.g. 0.184 0.165 0.157 rg)
                                    color_match = re.search(
                                        r'([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+rg', orig_stream_str
                                    )
                                    color_str = ""
                                    if color_match:
                                        color_str = (
                                            f"{color_match.group(1)} "
                                            f"{color_match.group(2)} "
                                            f"{color_match.group(3)} rg\n"
                                        )

                                    # Get field rect for text positioning
                                    rect = widget.rect
                                    w = rect.width
                                    h = rect.height

                                    # Build new appearance stream with same font reference
                                    new_stream = (
                                        f"/Tx BMC\n"
                                        f"q\n"
                                        f"BT\n"
                                        f"{font_ref} {font_size} Tf\n"
                                        f"{color_str}"
                                        f"2 {h * 0.25:.2f} Td\n"
                                        f"({fill_value}) Tj\n"
                                        f"ET\n"
                                        f"Q\n"
                                        f"EMC\n"
                                    )

                                    # Write new appearance stream back
                                    doc.update_stream(ap_xref, new_stream.encode("latin-1"))

                                    # Also set the field value for form readers
                                    widget.field_value = fill_value
                                    widget.update()

                                    filled = True
                                    logger.info(
                                        f"Filled '{pdf_field_name}' page {page_num+1} "
                                        f"using AP stream font {font_ref} size {font_size}"
                                    )
                                    continue

                        except Exception as ap_err:
                            logger.warning(
                                f"AP stream approach failed for '{pdf_field_name}': {ap_err}. "
                                f"Falling back to widget fill."
                            )

                        # Fallback: basic widget fill if AP stream method fails
                        widget.field_value = fill_value
                        widget.update()
                        filled = True
                        logger.info(f"Filled '{pdf_field_name}' page {page_num+1} (fallback)")

                if filled:
                    filled_fields.append({"fieldName": pdf_field_name, "value": fill_value})
                else:
                    logger.warning(f"Field '{pdf_field_name}' not found in PDF")

            # Save with full rendering (not incremental) to ensure appearance streams are written
            doc.save(output_path, incremental=False, encryption=fitz.PDF_ENCRYPT_NONE)
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
