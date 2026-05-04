# VigilantMLOps

**A production-grade platform for monitoring ML incidents, drift, and performance.**

VigilantMLOps gives ML teams a real-time observability layer over binary classification models — surfacing data drift, concept drift, and performance decay before they become production incidents. Built around a Network Intrusion / Malicious URL detection use case, but designed to be model-agnostic.

---

## Architecture

```mermaid
flowchart TD
    DS[("Public Dataset\n / Malicious Websites")]

    subgraph API["API Layer  ·  FastAPI"]
        direction TB
        INGEST["Ingestion Endpoint\nPOST /api/v1/monitoring"]
        GATE["ML Engine\nSchema Validator"]
        INGEST --> GATE
    end

    subgraph CORE["Monitoring Core"]
        DRIFT["Drift Service\nPSI / KS-test / JS Divergence"]
        PERF["Performance Service\nAccuracy / F1 / Confusion Matrix"]
        HEALTH["System Middleware\nLatency and Health Probes"]
    end

    subgraph ACTION["Action Engine"]
        direction TB
        ALERT["Alert Manager\nYAML Threshold Config"]
        DISPATCH["Incident Dispatcher"]
        LOW["Auto-Resolve\nLow Risk\nsystem_latency · schema_skew"]
        HIGH["Manual Ticket\nHigh Risk\ndata_drift · performance_drop"]
        ALERT --> DISPATCH
        DISPATCH -->|"severity = low"| LOW
        DISPATCH -->|"severity = high"| HIGH
    end

    subgraph PERSIST["Persistence  ·  DuckDB"]
        LOGS[("prediction_logs")]
        INC[("incidents")]
        EVALS[("evaluation_reports")]
    end

    DS -->|"ETL"| INGEST

    GATE -->|"Valid Payload"| DRIFT
    GATE -->|"Valid Payload"| PERF
    GATE -->|"System Metrics"| HEALTH
    GATE -->|"Schema Violation"| ALERT

    DRIFT -->|"Drift Score"| ALERT
    PERF -->|"Metric Decay"| ALERT
    HEALTH -->|"Latency Spike"| ALERT

    DRIFT --> LOGS
    PERF --> EVALS
    HEALTH --> LOGS

    LOW --> INC
    HIGH --> INC

    LOGS -->|"REST / JSON"| UI_MON["Monitoring Dashboard"]
    INC -->|"REST / JSON"| UI_INC["Incidents Dashboard"]
    EVALS -->|"REST / JSON"| UI_REP["Reporter Dashboard"]
```

### Key API Routes

| Prefix | Purpose |
|---|---|
| `/api/v1/monitoring` | Live drift & telemetry metrics |
| `/api/v1/reporter` | Pre/post-production evaluation reports |
| `/api/v1/incidents` | Incident log (auto-triggered by alerting engine) |
| `/api/v1/telemetry` | System health & latency probes |

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.12.x |
| Poetry | 1.8+ |
| Docker & Docker Compose | 24+ |
| Node.js | 20+ (for local UI dev) |

---

## Quick Start (Docker Compose)

```bash
# 1. Clone the repo
git clone https://github.com/baraalsedih/vigilant-mlops.git
cd vigilant-mlops

# 2. Copy environment template
cp .env.example .env          # edit values if needed

# 3. Start the full stack
docker compose up --build

# Services:
#   Backend API  →  http://localhost:8000
#   API Docs     →  http://localhost:8000/docs
#   Frontend     →  http://localhost:5173
```

---

## Local Development

Run `make help` to see all available commands.

### Backend

```bash
make dev-backend     # start FastAPI with hot reload
```

### Database

```bash
make db-init         # apply migrations (idempotent)
make db-reset        # drop all tables and re-migrate from scratch
make db-status       # show applied migration history
make seed            # populate DuckDB with evaluation + drift data
```

### Tests

```bash
make test
```

---

## Project Structure

```
vigilant-mlops/
├── apps/
│   ├── backend/          # FastAPI application
│   │   ├── api/v1/       # Route handlers (monitoring, reporter, incidents, telemetry)
│   │   ├── services/     # Business logic (drift_detector, performance_service, alerting_engine …)
│   │   ├── core/         # DB manager, migrations, procedures config
│   │   └── main.py
│   └── ui/               # React + Vite + Tailwind frontend
├── artifacts/            # Trained model artifacts
├── scripts/              # Seed & utility scripts
└── docker-compose.yml
```

---

## Incident Procedures

Automated remediation actions are defined in [apps/backend/core/procedures.yaml](apps/backend/core/procedures.yaml):

| Incident Type | Risk | Auto-Trigger |
|---|---|---|
| `system_latency` | Low | Yes — refetch DB |
| `schema_skew` | Low | Yes — refetch schema |
| `data_drift` | High | No — ticket only |
| `performance_drop` | High | No — ticket only |

---

## Contact

**Bara Al-Sedih** — [github.com/baraalsedih](https://github.com/baraalsedih) · baraalsedih@gmail.com
