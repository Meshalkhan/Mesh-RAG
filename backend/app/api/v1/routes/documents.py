from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.config import Settings, get_settings
from app.schemas.common import SuccessResponse
from app.schemas.document import DocumentUploadData
from app.services.document import DocumentService

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post(
    "/upload",
    response_model=SuccessResponse[DocumentUploadData],
    summary="Upload a PDF document",
)
async def upload_document(
    file: Annotated[UploadFile, File(description="PDF file to upload")],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SuccessResponse[DocumentUploadData]:
    """Accept a PDF upload, extract text, and return chunked content.

    Files are stored temporarily under the configured upload directory.
    Embeddings and retrieval are handled in later steps.
    """
    service = DocumentService(settings)
    data = await service.upload_pdf(file)
    return SuccessResponse(data=data)
