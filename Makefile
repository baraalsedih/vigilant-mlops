.PHONY: help dev-backend db-init db-reset db-status seed init-baseline test

-include .env
export

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-backend: ## Start the FastAPI backend with hot reload
	cd apps/backend && poetry run uvicorn main:app --reload

seed: ## Seed the DB: evaluate-data → evaluate-model → evaluate-drift (×3 batches). Use ARGS="--skip <stage>" to skip stages
	python3 scripts/seed.py $(ARGS)

db-init: ## Apply any pending migrations (idempotent)
	cd apps/backend && poetry run python -m core.db_manager init

db-reset: ## Drop all tables and re-apply all migrations from scratch
	cd apps/backend && poetry run python -m core.db_manager reset

db-status: ## Show applied migration history and pending versions
	cd apps/backend && poetry run python -m core.db_manager status

init-baseline: ## Compute feature baselines from a training file. Usage: make init-baseline INPUT=/path/to/training.csv
	@test -n "$(INPUT)" || (echo "ERROR: INPUT is required. Usage: make init-baseline INPUT=/path/to/data.csv" && exit 1)
	cd apps/backend && poetry run python scripts/init_baseline.py --input $(INPUT) $(if $(DB),--db $(DB),)

test: ## Run backend unit and integration tests
	cd apps/backend && poetry install --with dev --quiet && poetry run pytest
