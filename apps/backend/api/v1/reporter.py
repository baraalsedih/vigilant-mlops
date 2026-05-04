"""Reporter routes — trigger evaluation runs directly from Postman / the dashboard."""
from __future__ import annotations

from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from core.database import db
from services.alerting_engine import AlertManager
from services.reporter import ReporterConfig, ReporterService

router = APIRouter()

_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "reporter.json"
_reporter: ReporterService | None = None


def _get_reporter() -> ReporterService:
    global _reporter
    if _reporter is None:
        if not _CONFIG_PATH.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Reporter config not found at {_CONFIG_PATH}",
            )
        config = ReporterConfig.from_json(_CONFIG_PATH)
        _reporter = ReporterService(config, db=db, alert_manager=AlertManager(db=db))
    return _reporter


# ---------------------------------------------------------------------------
# Pre-Production — Data Evaluation
# ---------------------------------------------------------------------------


@router.post("/reporter/evaluate-data")
def run_evaluate_data():
    """
    Profile every data stage and split in one request.

    Returns:
      balanced.train / balanced.test / balanced.val  — processed balanced splits
      raw.unsw_nb15 / raw.ciciot2023 / raw.combined  — original raw CSV sources

    Warning: raw stages load large CSV files and may take a minute or more.
    """
    reporter = _get_reporter()
    try:
        result = reporter.evaluate_all_data()
        return {
            stage: {
                split: (v.model_dump() if hasattr(v, "model_dump") else v)
                for split, v in splits.items()
            }
            for stage, splits in result.items()
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Pre-Production — Model Evaluation
# ---------------------------------------------------------------------------


@router.post("/reporter/evaluate-model")
def run_evaluate_model(
    model_version: str | None = Query(None, description="Optional version tag stored with the report"),
):
    """
    Send the test split to the remote model API and compute classification metrics.
    Saves the result as the baseline for drift/decay tracking and persists to DB.
    Requires the model API at model_api.base_url to be running.
    """
    reporter = _get_reporter()
    try:
        return reporter.evaluate_model(model_version)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Model API unreachable — check model_api.base_url in reporter.json. Error: {exc}",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Production — Data Drift
# ---------------------------------------------------------------------------


class DriftRequest(BaseModel):
    records: list[dict[str, Any]]


@router.post("/reporter/evaluate-drift")
def run_evaluate_drift(
    split: str | None = Query(
        None,
        description="Use an existing split as stand-in production data (train/test/val). "
                    "Omit to POST records in the request body instead.",
    ),
    model_version: str | None = Query(None, description="Model version tag included in drift alert metadata."),
    body: DriftRequest | None = None,
):
    """
    Compare a production batch against the training reference distribution.
    For testing: pass ?split=val to reuse the validation split as fake production data.
    For real production data: POST a JSON body with { "records": [{...}, ...] }.
    """
    reporter = _get_reporter()

    if split is not None:
        try:
            production_df = reporter._loader.load_split(split)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    elif body is not None and body.records:
        from services.data_loader import DataLoader
        production_df = DataLoader.from_records(body.records)
    else:
        raise HTTPException(
            status_code=400,
            detail="Provide either ?split=<name> or a JSON body with 'records'.",
        )

    try:
        return reporter.evaluate_data_drift(production_df, model_version=model_version)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Production — Reset accumulated drift window
# ---------------------------------------------------------------------------


@router.delete("/reporter/production-log")
def reset_production_log():
    """
    Delete all accumulated production records from the drift window.
    Use this to start a fresh evaluation period (e.g. after a model retrain).
    Returns the number of rows deleted.
    """
    reporter = _get_reporter()
    try:
        n_deleted = reporter.reset_production_log()
        return {"deleted_records": n_deleted}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Utility — Model API health check
# ---------------------------------------------------------------------------


@router.get("/reporter/model-health")
def check_model_api_health():
    """Ping the configured model API health endpoint."""
    reporter = _get_reporter()
    url = reporter.config.model_api.health_url
    try:
        with httpx.Client(timeout=5) as client:
            resp = client.get(url)
        return {"model_api": "ok", "url": url, "status_code": resp.status_code}
    except httpx.HTTPError as exc:
        return {"model_api": "unreachable", "url": url, "error": str(exc)}
