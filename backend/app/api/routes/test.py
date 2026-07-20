from fastapi import APIRouter

from app.schemas.test import TestResponse

router = APIRouter(tags=["test"])


@router.get("/test", response_model=TestResponse)
def test_api() -> TestResponse:
    return TestResponse(message="API is working", status="ok")
