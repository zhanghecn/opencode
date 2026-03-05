#!/usr/bin/env bash
# Start opencode in interactive CLI mode for a specific agent.
# Useful for debugging agent prompts and tools directly.
#
# Usage:
#   ./scripts/agent-debug.sh <agent_name> [--env dev|prod]
#
# Examples:
#   ./scripts/agent-debug.sh demo-assistant
#   ./scripts/agent-debug.sh researcher --env prod

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

AGENT_NAME="${1:?Usage: $0 <agent_name> [--env dev|prod]}"
shift
ENV="dev"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

AGENT_DIR="$ROOT_DIR/agents/$ENV/$AGENT_NAME"
PLUGIN_DIR="$ROOT_DIR/plugins/openagent-plugin/src"

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

# Ensure plugins symlink inside .opencode/
AGENT_PLUGINS_DIR="$AGENT_DIR/.opencode/plugins"
mkdir -p "$AGENT_DIR/.opencode"
if [[ ! -L "$AGENT_PLUGINS_DIR" ]]; then
  rm -rf "$AGENT_PLUGINS_DIR"
  ln -sf "$PLUGIN_DIR" "$AGENT_PLUGINS_DIR"
fi

export OPENAGENT_NAME="$AGENT_NAME"

echo "Starting interactive debug session for agent: $AGENT_NAME ($ENV)"
echo "Directory: $AGENT_DIR"
echo ""

cd "$AGENT_DIR"
exec opencode
