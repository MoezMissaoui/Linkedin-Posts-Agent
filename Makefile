COMPOSE        ?= docker compose
DEV_PROFILE    := --profile dev
PROD_PROFILE   := --profile prod
DEV_SERVICE    := web-dev
PROD_SERVICE   := web

.DEFAULT_GOAL  := help

.PHONY: help \
	dev dev-build dev-up dev-down dev-logs dev-sh dev-restart \
	prod prod-build prod-up-build-d prod-down prod-logs prod-sh prod-restart \
	build up down stop restart ps logs sh \
	clean prune nuke

## --------------------------------------------------------------------
## Help
## --------------------------------------------------------------------
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

## --------------------------------------------------------------------
## Development (hot-reload, host port 2026)
## --------------------------------------------------------------------
dev: dev-up-build-d ## Alias for dev-up-build-d

dev-build: ## Build dev image
	$(COMPOSE) $(DEV_PROFILE) build $(DEV_SERVICE)

dev-up: ## Start dev container (foreground)
	$(COMPOSE) $(DEV_PROFILE) up

dev-up-build-d: ## Start dev container (detached)
	$(COMPOSE) $(DEV_PROFILE) up -d --build

dev-down: ## Stop and remove dev container
	$(COMPOSE) $(DEV_PROFILE) down

dev-logs: ## Tail dev logs
	$(COMPOSE) $(DEV_PROFILE) logs -f $(DEV_SERVICE)

dev-sh: ## Shell into dev container
	$(COMPOSE) $(DEV_PROFILE) exec $(DEV_SERVICE) sh

dev-restart: dev-down dev-up-build-d ## Restart dev container

## --------------------------------------------------------------------
## Production (standalone build, host port 2026)
## --------------------------------------------------------------------
prod: prod-up-build-d ## Alias for prod-up-build-d

prod-build: ## Build prod image
	$(COMPOSE) $(PROD_PROFILE) build $(PROD_SERVICE)

prod-up-build-d: ## Start prod container (detached)
	$(COMPOSE) $(PROD_PROFILE) up -d --build

prod-down: ## Stop and remove prod container
	$(COMPOSE) $(PROD_PROFILE) down

prod-logs: ## Tail prod logs
	$(COMPOSE) $(PROD_PROFILE) logs -f $(PROD_SERVICE)

prod-sh: ## Shell into prod container
	$(COMPOSE) $(PROD_PROFILE) exec $(PROD_SERVICE) sh

prod-restart: prod-down prod-up-build-d ## Restart prod container

## --------------------------------------------------------------------
## Generic (act on whatever is currently running)
## --------------------------------------------------------------------
build: ## Build all images (dev + prod)
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) build

up: ## Start all profiles
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) up -d --build

down: ## Stop all containers
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) down

stop: ## Stop without removing
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) stop

restart: down up-build-d ## Restart everything

ps: ## List containers
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) ps

logs: ## Tail all logs
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) logs -f

## --------------------------------------------------------------------
## Cleanup
## --------------------------------------------------------------------
clean: ## Remove containers and named volumes
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) down -v --remove-orphans

prune: ## Remove dangling images and build cache
	docker image prune -f
	docker builder prune -f

nuke: clean ## Full reset (containers, volumes, project images)
	-docker rmi postilys:test 2>/dev/null || true
	$(COMPOSE) $(DEV_PROFILE) $(PROD_PROFILE) down --rmi local -v --remove-orphans
