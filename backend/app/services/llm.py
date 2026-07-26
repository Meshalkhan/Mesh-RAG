from typing import Protocol

from fastapi import status
from openai import AsyncOpenAI

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMProvider(Protocol):
    async def generate(self, *, system_prompt: str, user_prompt: str) -> str: ...


class OpenAICompatibleProvider:
    """Chat completions via an OpenAI-compatible HTTP API."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        provider_name: str,
        missing_key_message: str,
        base_url: str | None = None,
    ) -> None:
        if not api_key.strip():
            raise AppError(
                missing_key_message,
                code="llm_not_configured",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        client_kwargs: dict[str, str] = {"api_key": api_key}
        if base_url:
            client_kwargs["base_url"] = base_url
        self._client = AsyncOpenAI(**client_kwargs)
        self._model = model
        self._provider_name = provider_name

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
                "llm_generate_failed provider=%s model=%s",
                self._provider_name,
                self._model,
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


def create_llm_provider(
    settings: Settings, provider: str | None = None
) -> LLMProvider:
    selected = (provider or settings.llm_provider).lower().strip()

    if selected == "openai":
        return OpenAICompatibleProvider(
            api_key=settings.openai_api_key,
            model=settings.openai_model,
            provider_name="openai",
            missing_key_message="OPENAI_API_KEY is not configured",
        )

    if selected == "groq":
        return OpenAICompatibleProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            provider_name="groq",
            missing_key_message="GROQ_API_KEY is not configured",
            base_url=settings.groq_base_url,
        )

    raise AppError(
        f"Unsupported LLM provider: {provider or settings.llm_provider}",
        code="unsupported_llm_provider",
        status_code=status.HTTP_400_BAD_REQUEST,
    )
