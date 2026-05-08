from fastapi import APIRouter
from templates import AGENT_TEMPLATES

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("")
async def list_templates():
    return AGENT_TEMPLATES
