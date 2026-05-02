"""Telemetry routes — placeholder for real-time metrics ingestion."""
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()


@router.get("/telemetry/status")
def telemetry_status():
    return {"status": "ok", "message": "Telemetry endpoint not yet implemented."}
