.PHONY: help dev-backend db-reset

DB_PATH := apps/backend/core/database/vigilant.db
SCHEMA_PATH := apps/backend/core/database/schema.sql

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-backend: ## Start the FastAPI backend with hot reload
	cd apps/backend && poetry run uvicorn main:app --reload

db-reset: ## Drop all data and re-apply schema (preserves table structure)
	@echo "Resetting database..."
	@rm -f $(DB_PATH)
	@cd apps/backend && poetry run python -c "\
import duckdb, pathlib; \
conn = duckdb.connect('$(DB_PATH)'); \
conn.execute(pathlib.Path('$(SCHEMA_PATH)').read_text()); \
conn.close(); \
print('Done — $(DB_PATH) reset.')"
