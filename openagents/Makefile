.PHONY: build run dev db-up db-down migrate gateway agent-serve agent-debug agent-list runtime-dev runtime-debug

# Start PostgreSQL
db-up:
	docker compose up -d postgres

db-down:
	docker compose down

# Run migrations
migrate:
	cd gateway && make migrate-up

# Build gateway
gateway:
	cd gateway && make build

# Run gateway in development mode
dev: db-up migrate
	cd gateway && make run

# Build and run everything with docker-compose
up:
	docker compose up --build -d

down:
	docker compose down

# --- Agent management ---

# Start runtime for a specific agent
# Usage: make agent-serve AGENT=demo-assistant [ENV=dev] [PORT=4096]
agent-serve:
	@./scripts/agent-serve.sh $(AGENT) --env $(or $(ENV),dev) --port $(or $(PORT),4096)

# Start runtime with Bun inspector for debugging
# Usage: make agent-debug AGENT=demo-assistant [ENV=dev] [PORT=4096]
agent-debug:
	@./scripts/agent-debug.sh $(AGENT) --env $(or $(ENV),dev) --port $(or $(PORT),4096)

# List available agents
agent-list:
	@echo "=== dev agents ===" && ls -1 agents/dev/ 2>/dev/null || echo "(none)"
	@echo "=== prod agents ===" && ls -1 agents/prod/ 2>/dev/null || echo "(none)"

# --- Runtime development ---

# Run runtime in watch mode (auto-restart on changes)
runtime-dev:
	cd runtime && bun --watch run src/index.ts

# Run runtime with Bun inspector
runtime-debug:
	cd runtime && bun --inspect run src/index.ts
