.PHONY: build run dev db-up db-down migrate gateway agent-serve agent-list

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

# --- Agent debugging ---

# Start opencode serve for a specific agent (directly, no gateway needed)
# Usage: make agent-serve AGENT=demo-assistant [ENV=dev] [PORT=4096]
agent-serve:
	@./scripts/agent-serve.sh $(AGENT) --env $(or $(ENV),dev) --port $(or $(PORT),4096)

# List available agents
agent-list:
	@echo "=== dev agents ===" && ls -1 agents/dev/ 2>/dev/null || echo "(none)"
	@echo "=== prod agents ===" && ls -1 agents/prod/ 2>/dev/null || echo "(none)"

# Setup plugins symlinks for all agents (inside .opencode/plugins/ for auto-discovery)
agent-setup:
	@for agent_dir in agents/dev/*/; do \
		if [ -d "$$agent_dir" ]; then \
			mkdir -p "$$agent_dir/.opencode" && \
			ln -sfn "$$(pwd)/plugins/openagent-plugin/src" "$$agent_dir/.opencode/plugins" && \
			echo "Linked plugins for $$(basename $$agent_dir)"; \
		fi \
	done
	@for agent_dir in agents/prod/*/; do \
		if [ -d "$$agent_dir" ]; then \
			mkdir -p "$$agent_dir/.opencode" && \
			ln -sfn "$$(pwd)/plugins/openagent-plugin/src" "$$agent_dir/.opencode/plugins" && \
			echo "Linked plugins for $$(basename $$agent_dir) (prod)"; \
		fi \
	done
