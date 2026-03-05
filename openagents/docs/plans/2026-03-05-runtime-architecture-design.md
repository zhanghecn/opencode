# OpenAgents Runtime Architecture Design

## Problem

Current plugin system relies on file:// URL + symlink, which:
- Cannot be breakpoint-debugged in IDE
- Scattered across agent directories, hard to maintain
- Requires filesystem setup (symlinks) per agent

## Solution: `openagents/runtime` as Monorepo Member

Create a Bun application at `openagents/runtime/` that:
1. Imports opencode core modules directly as workspace dependencies
2. Registers plugins programmatically (no file scanning)
3. Starts opencode server with full debugging support

### Architecture

```
openagents/
  runtime/
    src/
      index.ts              # Entry: start server
      plugins/
        tracing.ts          # Observability: tool calls, LLM messages, subagent tree
        openagent.ts         # Core: uploads, subagent limits, custom tools
        sandbox.ts           # Conditional sandbox routing
    package.json            # depends on "opencode": "workspace:*"
  gateway/                  # Go HTTP gateway (unchanged)
  agents/                   # Agent working directories
  docs/
```

### Key Mechanism: Plugin.register()

Minimal change to `packages/opencode/src/plugin/index.ts` (~5 lines):

```typescript
// Add to Plugin namespace:
const REGISTERED_PLUGINS: PluginInstance[] = []

export function register(plugin: PluginInstance) {
  REGISTERED_PLUGINS.push(plugin)
}

// In state() initialization, load REGISTERED alongside INTERNAL:
for (const plugin of [...INTERNAL_PLUGINS, ...REGISTERED_PLUGINS]) {
  // ...existing loading logic
}
```

This allows the runtime to do:

```typescript
// openagents/runtime/src/index.ts
import { Plugin } from "opencode/plugin"
import { Server } from "opencode/server/server"
import { tracingPlugin } from "./plugins/tracing"
import { openagentPlugin } from "./plugins/openagent"

// Register plugins BEFORE any request triggers Plugin.init()
Plugin.register(tracingPlugin)
Plugin.register(openagentPlugin)

// Start server
const server = Server.listen({ port: 4096, hostname: "127.0.0.1" })
```

### Why This Works for Debugging

- Plugin code is normal TypeScript in the same workspace
- Bun resolves imports through workspace linking
- `bun --inspect run src/index.ts` enables full breakpoint debugging
- IDE (VS Code / WebStorm) breakpoints work on all plugin code
- Stack traces show real source locations

### Tracing Plugin Design

Monitors all agent activity via hooks, outputs structured JSON lines:

```typescript
// Hooks used:
"tool.execute.before"  -> span start (tool_call / subagent_dispatch)
"tool.execute.after"   -> span end (tool_result / subagent_result)
"chat.message"         -> llm_message span
"event"                -> session tracking, trace ID management

// Each span carries:
{
  traceID,           // Per user-turn, shared across subagent tree
  spanID,            // Unique per operation
  parentSpanID,      // Links child subagent to parent
  agentName,         // From directory path or OPENAGENT_NAME env
  sessionID,
  type,              // tool_call | tool_result | llm_message | subagent_dispatch | subagent_result
  name,              // Tool name or agent name
  startTime, endTime, duration,
  metadata           // Tool args, output length, model info, etc
}
```

Output destination controlled by `OPENAGENT_TRACE_OUTPUT`:
- `stderr` (default for dev)
- `stdout` (for log collectors)
- Future: HTTP endpoint for centralized collection

### Gateway Integration

Go gateway spawns/connects to the runtime process:

```
[Frontend] -> [Go Gateway :8080] -> [Runtime :4096] -> [Kimi/Claude API]
                  |                       |
              JWT auth              Plugin hooks
              Agent CRUD            Tracing spans
              SSE translate         Tool overrides
              PostgreSQL
```

Gateway's `OpencodeManager` starts `bun openagents/runtime/src/index.ts` instead of `opencode serve`.

### package.json

```json
{
  "name": "@openagents/runtime",
  "type": "module",
  "scripts": {
    "dev": "bun --watch run src/index.ts",
    "debug": "bun --inspect run src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "opencode": "workspace:*",
    "@opencode-ai/plugin": "workspace:*",
    "@opencode-ai/sdk": "workspace:*"
  }
}
```

### Migration from Current Plugin System

1. Move `openagents/plugins/openagent-plugin/src/*.ts` -> `openagents/runtime/src/plugins/`
2. Remove `.opencode/plugins/` symlinks from agent directories
3. Agent directories only keep `.opencode/opencode.json` (model/provider config) + `AGENTS.md`
4. Gateway's manager starts runtime instead of raw `opencode serve`
5. Scripts (`agent-serve.sh`, `agent-debug.sh`) updated to run runtime entry

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Provider API key (auto-detected by @ai-sdk/anthropic) |
| `ANTHROPIC_BASE_URL` | Custom provider URL (${VAR} substitution in config) |
| `OPENAGENT_NAME` | Agent name for tracing spans |
| `OPENAGENT_TRACING` | Enable/disable tracing (default: true) |
| `OPENAGENT_TRACE_OUTPUT` | stderr / stdout |
| `OPENAGENT_MAX_SUBAGENTS` | Concurrent subagent limit |
| `OPENAGENT_SANDBOX_MODE` | local / sandbox |

### Implementation Steps

1. Add `Plugin.register()` to opencode source (5 lines)
2. Create `openagents/runtime/` package structure
3. Move plugin code from `plugins/openagent-plugin/src/` to `runtime/src/plugins/`
4. Write entry point `runtime/src/index.ts`
5. Add to pnpm-workspace.yaml
6. Update gateway manager to spawn runtime
7. Update agent scripts
8. Clean up old plugin/symlink infrastructure
9. End-to-end test with Kimi API
