import { Plugin } from "opencode/plugin/index"
import { Server } from "opencode/server/server"
import { Log } from "opencode/util/log"
import { Installation } from "opencode/installation/index"
import { Flag } from "opencode/flag/flag"
import { openagentPlugin } from "./plugins/openagent"

// Set SDK mode to disable interactive question tool
process.env.OPENCODE_CLIENT = process.env.OPENCODE_CLIENT || "sdk"
process.env.AGENT = "1"
process.env.OPENCODE = "1"
process.env.OPENCODE_PID = String(process.pid)

// Initialize logging
await Log.init({
  print: process.argv.includes("--print-logs"),
  dev: Installation.isLocal(),
  level: "INFO",
})

// Log environment configuration
console.log("[OpenAgents Runtime] Environment Configuration:")
console.log(`  OPENAGENT_PORT: ${process.env.OPENAGENT_PORT || "4096 (default)"}`)
console.log(`  OPENAGENT_HOST: ${process.env.OPENAGENT_HOST || "127.0.0.1 (default)"}`)
console.log(`  OPENAGENT_NAME: ${process.env.OPENAGENT_NAME || "not set"}`)
console.log(`  OPENAGENT_TRACING: ${process.env.OPENAGENT_TRACING || "true (default)"}`)
console.log(`  OPENAGENT_TRACE_OUTPUT: ${process.env.OPENAGENT_TRACE_OUTPUT || "stdout (default)"}`)
console.log(`  OPENAGENT_MAX_SUBAGENTS: ${process.env.OPENAGENT_MAX_SUBAGENTS || "5 (default)"}`)
console.log(`  OPENAGENT_SANDBOX_MODE: ${process.env.OPENAGENT_SANDBOX_MODE || "local (default)"}`)
console.log(`  OPENCODE_SERVER_PASSWORD: ${process.env.OPENCODE_SERVER_PASSWORD ? "set" : "not set"}`)

// Register plugins BEFORE any request triggers Plugin.init()
Plugin.register(openagentPlugin)

// Parse CLI args
const port = parseInt(process.env.OPENAGENT_PORT || process.env.OPENCODE_PORT || "4096", 10)
const hostname = process.env.OPENAGENT_HOST || "127.0.0.1"

if (!Flag.OPENCODE_SERVER_PASSWORD) {
  console.log("[OpenAgents Runtime] Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
}

// Start server
const server = Server.listen({ port, hostname })
console.log(`OpenAgents runtime listening on http://${server.hostname}:${server.port}`)

// Keep alive
await new Promise(() => {})
await server.stop()
