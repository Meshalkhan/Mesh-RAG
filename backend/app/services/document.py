import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile, status

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.schemas.document import DocumentUploadData
from app.services.document_processor import DocumentProcessor
from app.services.vector_store import VectorStore

logger = get_logger(__name__)

ALLOWED_CONTENT_TYPES = frozenset({"application/pdf"})
PDF_MAGIC = b"%PDF"


class DocumentService:
    """Handles temporary PDF upload storage and validation."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._upload_dir = Path(settings.upload_dir)
        self._processor = DocumentProcessor(settings)
        self._vector_store = VectorStore(settings)

    async def upload_pdf(self, file: UploadFile) -> DocumentUploadData:
        filename = self._validate_filename(file.filename)
        content_type = self._validate_content_type(file.content_type)
        content = await file.read()
        size = len(content)

        self._validate_size(size)
        self._validate_pdf_content(content)

        stored_path = await self._save_file(filename, content)
        logger.info(
            "document_uploaded filename=%s size=%s path=%s",
            filename,
            size,
            stored_path,
        )

        chunks = await self._processor.process(stored_path, filename)
        ids = await self._vector_store.add_documents(chunks)

        return DocumentUploadData(
            filename=filename,
            size=size,
            content_type=content_type,
            status="indexed",
            chunks=chunks,
            indexed_count=len(ids),
        )

    def _validate_filename(self, filename: str | None) -> str:
        if not filename or not filename.strip():
            raise AppError(
                "Filename is required",
                code="invalid_filename",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        safe_name = Path(filename).name
        if not safe_name.lower().endswith(".pdf"):
            raise AppError(
                "Only PDF files are supported",
                code="invalid_file_type",
                status_code=status.HTTP_400_BAD_REQUEST,
                details=[{"filename": safe_name}],
            )
        return safe_name

    def _validate_content_type(self, content_type: str | None) -> str:
        normalized = (content_type or "").split(";")[0].strip().lower()
        if normalized not in ALLOWED_CONTENT_TYPES:
            raise AppError(
                "Only PDF files are supported",
                code="invalid_file_type",
                status_code=status.HTTP_400_BAD_REQUEST,
                details=[{"content_type": content_type}],
            )
        return normalized

    def _validate_size(self, size: int) -> None:
        if size == 0:
            raise AppError(
                "Uploaded file is empty",
                code="empty_file",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if size > self._settings.max_upload_bytes:
            raise AppError(
                "Uploaded file exceeds the maximum allowed size",
                code="file_too_large",
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                details=[
                    {
                        "size": size,
                        "max_upload_bytes": self._settings.max_upload_bytes,
                    }
                ],
            )

    def _validate_pdf_content(self, content: bytes) -> None:
        if not content.startswith(PDF_MAGIC):
            raise AppError(
                "File content is not a valid PDF",
                code="invalid_pdf_content",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

    async def _save_file(self, filename: str, content: bytes) -> Path:
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        stored_path = self._upload_dir / f"{uuid4().hex}_{filename}"
        await asyncio.to_thread(stored_path.write_bytes, content)
        return stored_path
