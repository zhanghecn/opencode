#!/usr/bin/env bash
# Start openagents runtime for a specific agent.
#
# Usage:
#   ./scripts/agent-serve.sh <agent_name> [--env dev|prod] [--port 4096]
#
# Examples:
#   ./scripts/agent-serve.sh demo-assistant
#   ./scripts/agent-serve.sh researcher --env prod --port 4097

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
AGENT_NAME="${1:?Usage: $0 <agent_name> [--env dev|prod] [--port 4096]}"
shift
ENV="dev"
PORT="4096"

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

AGENT_DIR="$ROOT_DIR/agents/$ENV/$AGENT_NAME"

if [[ ! -d "$AGENT_DIR" ]]; then
  echo "Error: Agent directory not found: $AGENT_DIR"
  echo "Available agents:"
  ls -1 "$ROOT_DIR/agents/$ENV/" 2>/dev/null || echo "  (none)"
  exit 1
fi

# Load environment variables from .env or .env.example
if [[ -f "$ROOT_DIR/.env" ]]; then
  echo "Loading $ROOT_DIR/.env"
  set -a; source "$ROOT_DIR/.env"; set +a
elif [[ -f "$ROOT_DIR/.env.example" ]]; then
  echo "Loading $ROOT_DIR/.env.example"
  set -a; source "$ROOT_DIR/.env.example"; set +a
fi

# Export runtime environment
export OPENAGENT_NAME="$AGENT_NAME"
export OPENAGENT_PORT="$PORT"
export OPENCODE_CLIENT=sdk

echo ""
echo "========================================"
echo " Agent:   $AGENT_NAME"
echo " Env:     $ENV"
echo " Dir:     $AGENT_DIR"
echo " Port:    $PORT"
echo " Model:   ${ANTHROPIC_MODEL:-kimi-k2.5}"
echo " BaseURL: ${ANTHROPIC_BASE_URL:-not set}"
echo "========================================"
echo ""

cd "$AGENT_DIR"
exec bun run "$ROOT_DIR/runtime/src/index.ts"
