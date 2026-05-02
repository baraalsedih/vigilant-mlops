CREATE TABLE IF NOT EXISTS reports (
    report_id     VARCHAR PRIMARY KEY,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    report_type   VARCHAR NOT NULL,
    model_version VARCHAR,
    metrics       JSON,
    artifacts     JSON
);

CREATE TABLE IF NOT EXISTS incidents (
    incident_id   VARCHAR PRIMARY KEY,
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    severity      VARCHAR NOT NULL,
    incident_type VARCHAR NOT NULL,
    description   TEXT,
    status        VARCHAR NOT NULL DEFAULT 'TRIGGERED'
);
