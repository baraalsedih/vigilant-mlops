.PHONY: help dev-backend db-reset seed

-include .env
export

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(firstword $(MAKEFILE_LIST)) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

dev-backend: ## Start the FastAPI backend with hot reload
	cd apps/backend && poetry run uvicorn main:app --reload

seed: ## Seed the DB: evaluate-data → evaluate-model → evaluate-drift (×3 batches). Use ARGS="--skip <stage>" to skip stages
	python3 scripts/seed.py $(ARGS)

db-reset: ## Drop all data and re-apply schema (preserves table structure)
	cd apps/backend && poetry run python ../../scripts/db_reset.py
