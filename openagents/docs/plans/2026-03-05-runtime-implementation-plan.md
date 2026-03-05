# OpenAgents Runtime Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace external plugin/symlink system with a programmatic Bun runtime that imports opencode core directly, enabling full IDE debugging.

**Architecture:** `openagents/runtime/` is a Bun app in the monorepo workspace. It imports opencode's Plugin/Server modules, registers plugins as plain TypeScript objects (no file scanning), and starts the HTTP server. Go gateway spawns this runtime instead of `opencode serve`.

**Tech Stack:** Bun, TypeScript, opencode internals (workspace import), Go (gateway only)

---

### Task 1: Add Plugin.register() to opencode source

**Files:**
- Modify: `packages/opencode/src/plugin/index.ts:16-48`

**Step 1: Add REGISTERED_PLUGINS array and register() function**

In `packages/opencode/src/plugin/index.ts`, after line 22 (`INTERNAL_PLUGINS`), add:

```typescript
const REGISTERED_PLUGINS: PluginInstance[] = []

export function register(plugin: PluginInstance) {
  REGISTERED_PLUGINS.push(plugin)
}
```

**Step 2: Update state() to load REGISTERED_PLUGINS alongside INTERNAL_PLUGINS**

Change line 42 from:
```typescript
for (const plugin of INTERNAL_PLUGINS) {
```
to:
```typescript
for (const plugin of [...INTERNAL_PLUGINS, ...REGISTERED_PLUGINS]) {
```

**Step 3: Verify opencode still builds**

Run: `cd packages/opencode && bun run typecheck`
Expected: no errors

**Step 4: Commit**

```bash
git add packages/opencode/src/plugin/index.ts
git commit -m "feat(plugin): add Plugin.register() for programmatic plugin injection"
```

---

### Task 2: Create runtime package structure

**Files:**
- Create: `openagents/runtime/package.json`
- Create: `openagents/runtime/tsconfig.json`
- Modify: `package.json` (root, add workspace entry)

**Step 1: Create `openagents/runtime/package.json`**

```json
{
  "name": "@openagents/runtime",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun --watch run src/index.ts",
    "debug": "bun --inspect run src/index.ts",
    "start": "bun run src/index.ts"
  },
  "dependencies": {
    "opencode": "workspace:*",
    "@opencode-ai/plugin": "workspace:*",
    "@opencode-ai/sdk": "workspace:*",
    "@opencode-ai/util": "workspace:*"
  },
  "devDependencies": {
    "@types/bun": "catalog:"
  }
}
```

**Step 2: Create `openagents/runtime/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

**Step 3: Add workspace entry to root `package.json`**

Add `"openagents/runtime"` to `workspaces.packages` array:

```json
"workspaces": {
  "packages": [
    "packages/*",
    "packages/console/*",
    "packages/sdk/js",
    "packages/slack",
    "openagents/runtime"
  ],
```

**Step 4: Install dependencies**

Run: `bun install`
Expected: resolves workspace links for opencode, @opencode-ai/plugin, etc.

**Step 5: Commit**

```bash
git add openagents/runtime/package.json openagents/runtime/tsconfig.json package.json bun.lock
git commit -m "feat(runtime): scaffold runtime package in monorepo workspace"
```

---

### Task 3: Move plugin code into runtime

**Files:**
- Create: `openagents/runtime/src/plugins/openagent.ts`
- Create: `openagents/runtime/src/plugins/tracing.ts`
- Create: `openagents/runtime/src/plugins/sandbox.ts`

**Step 1: Move openagent plugin**

Copy `openagents/plugins/openagent-plugin/src/index.ts` to `openagents/runtime/src/plugins/openagent.ts`. Adapt imports — replace `@opencode-ai/plugin` imports (they stay the same since it's a workspace dep). Inline the memory module. Remove the `export default` wrapper — export the plugin function directly:

```typescript
import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { createTracingHooks } from "./tracing"

export const openagentPlugin: Plugin = async (input) => {
  const sandboxMode = process.env.OPENAGENT_SANDBOX_MODE || "local"
  const maxSubagents = parseInt(process.env.OPENAGENT_MAX_SUBAGENTS || "5", 10)
  const tracingEnabled = process.env.OPENAGENT_TRACING !== "false"

  let activeSubagents = 0
  const tracing = tracingEnabled ? createTracingHooks() : null

  const hooks: Hooks = {
    event: async (eventInput) => {
      await tracing?.event?.(eventInput)
    },

    "chat.message": async (input, output) => {
      const uploadedFiles = process.env.OPENAGENT_UPLOADED_FILES
      if (uploadedFiles) {
        const fileList = JSON.parse(uploadedFiles)
        if (fileList.length > 0) {
          const filesXml = fileList
            .map((f: { name: string; path: string; size: string }) =>
              `- ${f.name} (${f.size})\n  Path: ${f.path}`
            )
            .join("\n")
          output.parts.push({
            type: "text",
            text: `<uploaded_files>\n${filesXml}\n</uploaded_files>`,
          } as any)
        }
      }
      await tracing?.["chat.message"]?.(input, output)
    },

    "tool.execute.before": async (input, output) => {
      if (input.tool === "task") {
        if (activeSubagents >= maxSubagents) {
          throw new Error(`Maximum concurrent subagents (${maxSubagents}) reached.`)
        }
        activeSubagents++
      }
      await tracing?.["tool.execute.before"]?.(input, output)
    },

    "tool.execute.after": async (input, output) => {
      if (input.tool === "task") {
        activeSubagents = Math.max(0, activeSubagents - 1)
      }
      await tracing?.["tool.execute.after"]?.(input, output)
    },

    tool: {
      ask_clarification: tool({
        description: "Ask the user a clarifying question when the request is ambiguous.",
        args: {
          question: tool.schema.string().describe("The question to ask the user"),
          options: tool.schema.array(tool.schema.string()).optional().describe("Optional suggested answers"),
        },
        async execute(args) {
          return JSON.stringify({ type: "clarification", question: args.question, options: args.options || [] })
        },
      }),

      view_image: tool({
        description: "Display an image to the user.",
        args: {
          path: tool.schema.string().describe("Path to the image file"),
          caption: tool.schema.string().optional().describe("Optional caption"),
        },
        async execute(args) {
          return JSON.stringify({ type: "image", path: args.path, caption: args.caption || "" })
        },
      }),

      present_files: tool({
        description: "Present generated files to the user as downloadable artifacts.",
        args: {
          files: tool.schema.array(tool.schema.object({
            path: tool.schema.string().describe("File path"),
            type: tool.schema.string().describe("MIME type"),
            description: tool.schema.string().optional().describe("Description"),
          })).describe("List of files to present"),
        },
        async execute(args) {
          return JSON.stringify({ type: "present_files", files: args.files })
        },
      }),

      ...(sandboxMode !== "local" ? (await import("./sandbox")).sandboxTools() : {}),
    },
  }

  return hooks
}
```

**Step 2: Copy tracing.ts**

Copy `openagents/plugins/openagent-plugin/src/tracing.ts` to `openagents/runtime/src/plugins/tracing.ts` as-is (it only imports from `@opencode-ai/plugin`).

**Step 3: Copy sandbox.ts**

Copy `openagents/plugins/openagent-plugin/src/sandbox.ts` to `openagents/runtime/src/plugins/sandbox.ts` as-is.

**Step 4: Verify TypeScript resolves**

Run: `cd openagents/runtime && bunx tsc --noEmit`
Expected: no errors (or only non-blocking warnings)

**Step 5: Commit**

```bash
git add openagents/runtime/src/plugins/
git commit -m "feat(runtime): move plugin code into runtime package"
```

---

### Task 4: Create runtime entry point

**Files:**
- Create: `openagents/runtime/src/index.ts`

**Step 1: Write the entry point**

```typescript
import { Plugin } from "opencode/plugin"
import { Server } from "opencode/server/server"
import { Log } from "opencode/util/log"
import { Installation } from "opencode/installation"
import { Flag } from "opencode/flag/flag"
import { openagentPlugin } from "./plugins/openagent"

// Initialize logging
await Log.init({
  print: process.argv.includes("--print-logs"),
  dev: true,
  level: "INFO",
})

// Register plugins BEFORE any request triggers Plugin.init()
Plugin.register(openagentPlugin)

// Parse CLI args
const port = parseInt(process.env.OPENAGENT_PORT || process.env.OPENCODE_PORT || "4096", 10)
const hostname = process.env.OPENAGENT_HOST || "127.0.0.1"

// Set SDK mode to disable interactive question tool
process.env.OPENCODE_CLIENT = process.env.OPENCODE_CLIENT || "sdk"

if (!Flag.OPENCODE_SERVER_PASSWORD) {
  console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
}

// Start server
const server = Server.listen({ port, hostname })
console.log(`OpenAgents runtime listening on http://${server.hostname}:${server.port}`)

// Keep alive
await new Promise(() => {})
await server.stop()
```

**Step 2: Test startup**

Run: `cd openagents/runtime && source ../openagents/.env.example && bun run src/index.ts`
Expected: `OpenAgents runtime listening on http://127.0.0.1:4096`

**Step 3: Test health endpoint**

Run: `curl -s http://localhost:4096/global/health | python3 -m json.tool`
Expected: `{"healthy": true, "version": "..."}`

**Step 4: Commit**

```bash
git add openagents/runtime/src/index.ts
git commit -m "feat(runtime): add entry point with programmatic plugin registration"
```

---

### Task 5: End-to-end test with Kimi API

**Step 1: Start runtime with Kimi config**

```bash
cd openagents && source .env.example
cd runtime && bun run src/index.ts &
sleep 3
```

**Step 2: Create session**

```bash
SESSION_ID=$(curl -s -X POST http://localhost:4096/session \
  -H "Content-Type: application/json" -d '{}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "Session: $SESSION_ID"
```
Expected: session ID like `ses_...`

**Step 3: Send message**

```bash
curl -s -X POST "http://localhost:4096/session/$SESSION_ID/message" \
  -H "Content-Type: application/json" \
  -d '{"modelID":"kimi-k2.5","providerID":"anthropic","parts":[{"type":"text","text":"Say hello in one sentence."}]}' \
  --max-time 30
```
Expected: JSON response with no error field

**Step 4: Verify response**

```bash
sleep 8
curl -s "http://localhost:4096/session/$SESSION_ID/message" \
  | python3 -c "import sys,json; [print(f'[{m[\"info\"][\"role\"]}] {p[\"text\"][:200]}') for m in json.load(sys.stdin) for p in m.get('parts',[]) if p.get('text')]"
```
Expected: assistant response text visible

**Step 5: Kill and commit**

```bash
kill %1
git add -A openagents/runtime/
git commit -m "test(runtime): verify end-to-end with Kimi API"
```

---

### Task 6: Update gateway manager to spawn runtime

**Files:**
- Modify: `openagents/gateway/internal/proxy/manager.go:30-62`

**Step 1: Change Start() to spawn runtime instead of opencode serve**

Replace the command construction in `Start()`:

```go
func (m *OpencodeManager) Start(ctx context.Context) error {
	runtimeBin := os.Getenv("RUNTIME_BIN")
	if runtimeBin == "" {
		runtimeBin = "bun"
	}
	runtimeEntry := os.Getenv("RUNTIME_ENTRY")
	if runtimeEntry == "" {
		runtimeEntry = "../runtime/src/index.ts"
	}

	m.cmd = exec.CommandContext(ctx, runtimeBin, "run", runtimeEntry)

	// Config still injected via OPENCODE_CONFIG_CONTENT for provider/model settings
	configContent := m.buildConfig()
	configJSON, _ := json.Marshal(configContent)

	m.cmd.Env = append(os.Environ(),
		fmt.Sprintf("OPENCODE_CONFIG_CONTENT=%s", string(configJSON)),
		"OPENCODE_CLIENT=sdk",
		fmt.Sprintf("OPENAGENT_PORT=%d", m.port),
	)

	m.cmd.Stdout = os.Stdout
	m.cmd.Stderr = os.Stderr

	if err := m.cmd.Start(); err != nil {
		return fmt.Errorf("failed to start runtime: %w", err)
	}

	log.Printf("openagents runtime started on port %d (pid=%d)", m.port, m.cmd.Process.Pid)

	if err := m.waitReady(ctx); err != nil {
		return fmt.Errorf("runtime not ready: %w", err)
	}

	return nil
}
```

**Step 2: Remove pluginPath from manager (no longer needed)**

Remove `pluginPath` field from struct and constructor. Remove the plugin injection from `buildConfig()`.

**Step 3: Update main.go to remove pluginPath**

In `cmd/server/main.go`, change:
```go
mgr := proxy.NewOpencodeManager(opencodePort, agentsRoot)
```

**Step 4: Verify build**

Run: `cd openagents/gateway && go build ./cmd/server/`
Expected: BUILD OK

**Step 5: Commit**

```bash
git add openagents/gateway/
git commit -m "feat(gateway): spawn runtime process instead of opencode serve"
```

---

### Task 7: Update scripts and Makefile

**Files:**
- Modify: `openagents/scripts/agent-serve.sh`
- Modify: `openagents/scripts/agent-debug.sh`
- Modify: `openagents/Makefile`
- Modify: `openagents/.env.example`

**Step 1: Simplify agent-serve.sh**

Replace the plugin symlink logic with direct runtime invocation:

```bash
# Instead of symlinking plugins and running opencode serve:
cd "$AGENT_DIR"
exec bun run "$ROOT_DIR/runtime/src/index.ts"
```

**Step 2: Simplify agent-debug.sh**

Same approach — run runtime entry with `--inspect` for debugging:

```bash
cd "$AGENT_DIR"
exec bun --inspect run "$ROOT_DIR/runtime/src/index.ts"
```

**Step 3: Update Makefile**

- `agent-serve` target: runs `bun run runtime/src/index.ts` in agent dir
- Remove `agent-setup` target (no more symlinks needed)
- Add `runtime-dev` target: `cd runtime && bun --watch run src/index.ts`
- Add `runtime-debug` target: `cd runtime && bun --inspect run src/index.ts`

**Step 4: Remove OPENAGENT_PLUGIN_PATH from .env.example**

It's no longer needed since plugins are compiled into the runtime.

**Step 5: Commit**

```bash
git add openagents/scripts/ openagents/Makefile openagents/.env.example
git commit -m "chore: update scripts to use runtime instead of plugin symlinks"
```

---

### Task 8: Clean up old plugin infrastructure

**Files:**
- Delete: `openagents/plugins/` (entire directory)
- Delete: `openagents/agents/dev/*/. opencode/plugins` (symlinks)
- Modify: `openagents/gateway/internal/handler/agent.go` (remove symlink creation)

**Step 1: Remove old plugins directory**

```bash
rm -rf openagents/plugins/
```

**Step 2: Remove symlinks from agent directories**

```bash
rm -f openagents/agents/dev/*/. opencode/plugins
rm -f openagents/agents/dev/demo-assistant/.opencode/plugins
rm -f openagents/agents/dev/researcher/.opencode/plugins
```

**Step 3: Remove symlink creation from agent.go**

In `createAgentFileSystem()`, remove the symlink creation block (lines 147-157).

**Step 4: Verify gateway build**

Run: `cd openagents/gateway && go build ./cmd/server/`
Expected: BUILD OK

**Step 5: Commit**

```bash
git add -A openagents/
git commit -m "chore: remove old plugin symlink infrastructure"
```

---

### Task 9: Verify IDE debugging works

**Step 1: Create VS Code launch config**

Create `openagents/runtime/.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Runtime",
      "program": "${workspaceFolder}/src/index.ts",
      "cwd": "${workspaceFolder}/../agents/dev/demo-assistant",
      "env": {
        "ANTHROPIC_API_KEY": "${env:ANTHROPIC_API_KEY}",
        "ANTHROPIC_BASE_URL": "${env:ANTHROPIC_BASE_URL}",
        "OPENCODE_CLIENT": "sdk"
      }
    }
  ]
}
```

**Step 2: Set breakpoint and test**

- Open `openagents/runtime/src/plugins/tracing.ts` in IDE
- Set breakpoint in `tool.execute.before` handler
- Run debug configuration
- Send a message via curl
- Breakpoint should hit when the agent calls a tool

**Step 3: Commit**

```bash
git add openagents/runtime/.vscode/
git commit -m "chore(runtime): add VS Code debug launch config"
```
