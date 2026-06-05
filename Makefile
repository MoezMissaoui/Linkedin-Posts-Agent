COMPOSE ?= docker compose

.DEFAULT_GOAL := help

.PHONY: help build up down restart logs sh ps clean prune nuke

## --------------------------------------------------------------------
## Help
## --------------------------------------------------------------------
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## --------------------------------------------------------------------
## Lifecycle (single environment, host port 2026)
## --------------------------------------------------------------------
build: ## Build the image
	$(COMPOSE) build

up: ## Build and start (detached)
	$(COMPOSE) up -d --build

down: ## Stop and remove the container
	$(COMPOSE) down

restart: ## Restart (down + up --build)
	$(COMPOSE) down
	$(COMPOSE) up -d --build

logs: ## Tail logs
	$(COMPOSE) logs -f

sh: ## Shell into the container
	$(COMPOSE) exec app sh

ps: ## List containers
	$(COMPOSE) ps

## --------------------------------------------------------------------
## Cleanup
## --------------------------------------------------------------------
clean: ## Remove container and named volumes
	$(COMPOSE) down -v --remove-orphans

prune: ## Remove dangling images and build cache
	docker image prune -f
	docker builder prune -f

nuke: ## Full reset (container, volumes, project image)
	$(COMPOSE) down --rmi local -v --remove-orphans
