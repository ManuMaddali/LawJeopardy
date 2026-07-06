from io import BytesIO

from docx import Document
from pypdf import PdfReader


def extract_pdf_text(file_bytes: bytes) -> tuple[str, int]:
    reader = PdfReader(BytesIO(file_bytes))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n\n".join(pages), len(reader.pages)


def extract_docx_text(file_bytes: bytes) -> tuple[str, int]:
    doc = Document(BytesIO(file_bytes))
    paragraphs = [paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs), len(paragraphs)
