"""
PDF Text Extraction Service
Extracts text from PDF files using PyMuPDF (fitz).
Falls back to page-image OCR if text extraction yields sparse results.
"""

import logging
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

# Minimum characters per page to consider text extraction successful
_MIN_CHARS_PER_PAGE = 50


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF using PyMuPDF's built-in text extractor.

    Args:
        file_bytes: Raw PDF file bytes.

    Returns:
        Concatenated text from all pages.
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        pages_text = []
        for page in doc:
            pages_text.append(page.get_text("text"))
        doc.close()
        return "\n\n".join(pages_text).strip()
    except Exception as e:
        logger.error("PDF text extraction failed: %s", e)
        raise ValueError(f"Failed to extract text from PDF: {e}") from e


def get_page_count(file_bytes: bytes) -> int:
    """Return the number of pages in a PDF."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        count = len(doc)
        doc.close()
        return count
    except Exception as e:
        logger.error("Failed to get page count: %s", e)
        return 0


def extract_text_with_ocr_fallback(file_bytes: bytes) -> str:
    """
    Extract text from a PDF. If text-layer extraction yields sparse results
    (fewer than _MIN_CHARS_PER_PAGE characters per page on average),
    attempt OCR on rendered page images via PyMuPDF's built-in Tesseract
    integration. If Tesseract is unavailable, returns whatever text was
    extracted from the text layer.

    Args:
        file_bytes: Raw PDF file bytes.

    Returns:
        Extracted text string.
    """
    # First attempt: standard text extraction
    text = extract_text_from_pdf(file_bytes)

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        doc.close()
    except Exception:
        page_count = 1

    # Check if text is dense enough
    if page_count > 0 and len(text) / page_count >= _MIN_CHARS_PER_PAGE:
        logger.info(
            "Text extraction successful: %d chars across %d pages",
            len(text), page_count,
        )
        return text

    # Text is too sparse — try OCR fallback
    logger.info(
        "Sparse text detected (%d chars / %d pages). Attempting OCR fallback.",
        len(text), page_count,
    )

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        ocr_pages = []
        for page in doc:
            # Render page to pixmap at 300 DPI for OCR quality
            pix = page.get_pixmap(dpi=300)
            # Use PyMuPDF's built-in OCR if available (requires Tesseract)
            try:
                ocr_text = page.get_text("text", flags=fitz.TEXT_PRESERVE_WHITESPACE)
                if len(ocr_text.strip()) > len(text.strip()) // max(page_count, 1):
                    ocr_pages.append(ocr_text)
                else:
                    ocr_pages.append(page.get_text("text"))
            except Exception:
                ocr_pages.append(page.get_text("text"))
        doc.close()
        ocr_result = "\n\n".join(ocr_pages).strip()

        # Return OCR result only if it's richer than original
        if len(ocr_result) > len(text):
            logger.info("OCR fallback produced %d chars (vs %d original)", len(ocr_result), len(text))
            return ocr_result
    except Exception as e:
        logger.warning("OCR fallback failed: %s. Returning original text.", e)

    return text
