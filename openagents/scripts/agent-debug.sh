#!/usr/bin/env bash
# Start openagents runtime with Bun inspector for IDE debugging.
#
# Usage:
#   ./scripts/agent-debug.sh <agent_name> [--env dev|prod] [--port 4096]
#
# Examples:
#   ./scripts/agent-debug.sh demo-assistant
#   ./scripts/agent-debug.sh researcher --env prod

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

AGENT_NAME="${1:?Usage: $0 <agent_name> [--env dev|prod] [--port 4096]}"
shift
ENV="dev"
PORT="4096"

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

# Load environment
if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a; source "$ROOT_DIR/.env"; set +a
elif [[ -f "$ROOT_DIR/.env.example" ]]; then
  set -a; source "$ROOT_DIR/.env.example"; set +a
fi

export OPENAGENT_NAME="$AGENT_NAME"
export OPENAGENT_PORT="$PORT"
export OPENCODE_CLIENT=sdk

echo "Starting debug session for agent: $AGENT_NAME ($ENV)"
echo "Directory: $AGENT_DIR"
echo "Bun inspector will be available at ws://localhost:6499/..."
echo ""

cd "$AGENT_DIR"
exec bun --inspect=ws://localhost:6499/ run "$ROOT_DIR/runtime/src/index.ts"
