from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.cors import add_cors_middleware


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )
    add_cors_middleware(app, settings)
    app.include_router(api_router, prefix=settings.api_prefix)
    return app


app = create_app()
