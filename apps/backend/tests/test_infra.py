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


# ---------------------------------------------------------------------------
# Logger verification
# ---------------------------------------------------------------------------

def test_logger_directory_is_created():
    from core.logger import get_logger

    get_logger("test.infra")

    log_dir = Path(__file__).parent.parent / "core" / "logs"
    assert log_dir.is_dir(), f"Expected core/logs/ directory at {log_dir}"


def test_logger_file_is_created():
    from core.logger import get_logger

    get_logger("test.infra")

    log_file = Path(__file__).parent.parent / "core" / "logs" / "backend.log"
    assert log_file.is_file(), f"Expected backend.log at {log_file}"


def test_logger_write_does_not_raise():
    from core.logger import get_logger

    log = get_logger("test.infra")
    log.info("Test Log")
