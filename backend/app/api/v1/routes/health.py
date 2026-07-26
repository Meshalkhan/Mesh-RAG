from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.schemas.chat import LlmProviderName
from app.schemas.health import HealthResponse, LlmProviderAvailability

router = APIRouter(tags=["health"])


def _normalize_default_provider(settings: Settings) -> LlmProviderName:
    selected = settings.llm_provider.lower().strip()
    if selected == "openai":
        return "openai"
    return "groq"


@router.get("/health", response_model=HealthResponse)
async def health_check(
    settings: Annotated[Settings, Depends(get_settings)],
) -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=settings.app_name,
        version=settings.app_version,
        default_llm_provider=_normalize_default_provider(settings),
        llm_providers=[
            LlmProviderAvailability(
                name="groq",
                configured=bool(settings.groq_api_key.strip()),
            ),
            LlmProviderAvailability(
                name="openai",
                configured=bool(settings.openai_api_key.strip()),
            ),
        ],
    )
