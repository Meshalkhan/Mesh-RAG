from typing import Protocol

from fastapi import status
from openai import AsyncOpenAI

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMProvider(Protocol):
    async def generate(self, *, system_prompt: str, user_prompt: str) -> str: ...


class OpenAIProvider:
    """OpenAI chat completions provider."""

    def __init__(self, *, api_key: str, model: str) -> None:
        if not api_key.strip():
            raise AppError(
                "OPENAI_API_KEY is not configured",
                code="llm_not_configured",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate(self, *, system_prompt: str, user_prompt: str) -> str:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                temperature=0,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
        except Exception as exc:
            logger.exception(
                "llm_generate_failed provider=openai model=%s", self._model
            )
            raise AppError(
                "Failed to generate an answer from the LLM",
                code="llm_error",
                status_code=status.HTTP_502_BAD_GATEWAY,
                details=[{"reason": str(exc)}],
            ) from exc

        content = response.choices[0].message.content if response.choices else None
        if not content or not content.strip():
            raise AppError(
                "LLM returned an empty response",
                code="llm_empty_response",
                status_code=status.HTTP_502_BAD_GATEWAY,
            )
        return content.strip()


def create_llm_provider(settings: Settings) -> LLMProvider:
    provider = settings.llm_provider.lower().strip()
    if provider == "openai":
        return OpenAIProvider(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
        )
    raise AppError(
        f"Unsupported LLM provider: {settings.llm_provider}",
        code="unsupported_llm_provider",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
