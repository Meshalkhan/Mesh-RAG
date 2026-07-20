from fastapi import APIRouter

from app.dependencies.services import HealthServiceDep
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(health_service: HealthServiceDep) -> HealthResponse:
    return await health_service.get_health()
