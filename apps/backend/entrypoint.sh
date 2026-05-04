#!/bin/sh
set -e

echo "Running database migrations..."
python -m core.db_manager init

echo "Starting FastAPI server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
