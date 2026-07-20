from typing import Literal

from pydantic import BaseModel, Field


class ChunkMetadata(BaseModel):
    filename: str
    page_number: int = Field(ge=1)


class DocumentChunk(BaseModel):
    content: str
    metadata: ChunkMetadata


class SimilarityResult(BaseModel):
    content: str
    metadata: ChunkMetadata
    distance: float


class DocumentUploadData(BaseModel):
    """Metadata returned after a successful PDF upload and processing."""

    filename: str
    size: int = Field(ge=0)
    content_type: str
    status: Literal["uploaded", "processed", "indexed"]
    chunks: list[DocumentChunk] = Field(default_factory=list)
    indexed_count: int = Field(default=0, ge=0)
