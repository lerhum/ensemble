.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down restart build seed migrate logs ps clean install

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

up: ## Lance toute la stack (db + migrate + api + web)
	$(COMPOSE) up

down: ## Arrête la stack
	$(COMPOSE) down

restart: down up ## Redémarre la stack

build: ## (Re)build les images Docker
	$(COMPOSE) build

migrate: ## Applique les migrations Drizzle (service one-shot)
	$(COMPOSE) run --rm migrate pnpm --filter @ensemble/db migrate

seed: ## (Re)seed la base avec le contenu de démo
	$(COMPOSE) run --rm migrate pnpm --filter @ensemble/db seed

logs: ## Suit les logs de tous les services
	$(COMPOSE) logs -f

ps: ## Liste les services
	$(COMPOSE) ps

install: ## Installe les dépendances en local (hors Docker)
	pnpm install

clean: ## Arrête tout et supprime le volume Postgres (DESTRUCTIF)
	$(COMPOSE) down -v
