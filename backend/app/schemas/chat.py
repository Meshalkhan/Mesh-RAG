from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)


class ChatSource(BaseModel):
    filename: str
    page_number: int = Field(ge=1)


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]
