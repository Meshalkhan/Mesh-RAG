from fastapi import APIRouter

from app.api.v1.routes import chat, documents, health

router = APIRouter()
router.include_router(health.router)
router.include_router(documents.router)
router.include_router(chat.router)
