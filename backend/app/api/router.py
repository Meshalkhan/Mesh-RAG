from fastapi import APIRouter

from app.api.routes import health, test

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(test.router)
