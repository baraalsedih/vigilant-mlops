"""VigilantMLOps — FastAPI application entry point.

Run with:
    uvicorn main:app --reload          (from apps/backend/)
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import db
from api.v1 import incidents, monitoring, reporter, telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.startup()
    yield
    db.shutdown()


app = FastAPI(
    title="VigilantMLOps",
    description="Production-grade MLOps monitoring and observability platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy", "service": "vigilant-api"}


app.include_router(monitoring.router, prefix="/api/v1", tags=["monitoring"])
app.include_router(incidents.router, prefix="/api/v1", tags=["incidents"])
app.include_router(reporter.router, prefix="/api/v1", tags=["reporter"])
app.include_router(telemetry.router, prefix="/api/v1", tags=["telemetry"])
