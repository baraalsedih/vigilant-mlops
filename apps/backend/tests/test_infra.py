"""Smoke tests that verify basic infrastructure is wired up correctly."""
from __future__ import annotations

from pathlib import Path


async def test_health_endpoint_returns_200(async_client):
    response = await async_client.get("/health")

    assert response.status_code == 200


async def test_health_endpoint_body_is_healthy(async_client):
    response = await async_client.get("/health")
    body = response.json()

    assert body["status"] == "healthy"


def test_core_database_directory_exists():
    db_dir = Path(__file__).parent.parent / "core" / "database"

    assert db_dir.is_dir(), f"Expected core/database/ directory at {db_dir}"
