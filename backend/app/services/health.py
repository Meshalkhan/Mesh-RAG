from app.core.config import Settings
from app.schemas.health import HealthResponse


class HealthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def get_health(self) -> HealthResponse:
        return HealthResponse(
            status="healthy",
            service=self._settings.app_name,
            version=self._settings.app_version,
        )
