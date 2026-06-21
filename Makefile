.PHONY: help build up up-d down logs logs-db test lint format clean restart shell db-shell

help:
	@echo ""
	@echo "Comandos disponíveis:"
	@echo "  make build      build das imagens Docker"
	@echo "  make up         inicia containers em foreground"
	@echo "  make up-d       inicia containers em background (detached)"
	@echo "  make down       para containers"
	@echo "  make restart    reinicia o serviço middleware"
	@echo "  make logs       logs do middleware (follow)"
	@echo "  make logs-db    logs do postgres (follow)"
	@echo "  make test       roda testes"
	@echo "  make lint       roda linter"
	@echo "  make format     formata código"
	@echo "  make shell      abre shell no container middleware"
	@echo "  make db-shell   abre psql no container postgres"
	@echo "  make clean      para containers e remove volumes"
	@echo ""

build:
	docker compose build

up:
	docker compose up

up-d:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart middleware

logs:
	docker compose logs -f middleware

logs-db:
	docker compose logs -f postgres

test:
	docker compose exec middleware npm test

lint:
	docker compose exec middleware npm run lint

format:
	docker compose exec middleware npm run format

shell:
	docker compose exec middleware sh

db-shell:
	docker compose exec postgres psql -U $${DB_USER} -d $${DB_NAME}

clean:
	docker compose down -v
