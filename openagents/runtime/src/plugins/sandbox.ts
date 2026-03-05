import { tool, type ToolDefinition } from "@opencode-ai/plugin"

/**
 * Sandbox routing plugin
 *
 * When OPENAGENT_SANDBOX_MODE is not "local", overrides bash/read/write/edit
 * to route through a sandbox execution environment.
 */

const SANDBOX_API_URL = process.env.OPENAGENT_SANDBOX_API_URL || "http://localhost:9000"

async function sandboxRequest(endpoint: string, body: Record<string, unknown>): Promise<string> {
  const resp = await fetch(`${SANDBOX_API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    throw new Error(`Sandbox API error: ${resp.status} ${await resp.text()}`)
  }
  return resp.text()
}

export function sandboxTools(): Record<string, ToolDefinition> {
  return {
    bash: tool({
      description: "Execute a shell command in a sandboxed environment. Returns stdout/stderr.",
      args: {
        command: tool.schema.string().describe("The shell command to execute"),
        timeout: tool.schema.number().optional().describe("Timeout in milliseconds"),
      },
      async execute(args) {
        return sandboxRequest("/execute", {
          command: args.command,
          timeout: args.timeout || 30000,
        })
      },
    }),

    read: tool({
      description: "Read file contents from the sandbox filesystem.",
      args: {
        file_path: tool.schema.string().describe("Absolute path to the file"),
        offset: tool.schema.number().optional().describe("Line offset to start reading from"),
        limit: tool.schema.number().optional().describe("Number of lines to read"),
      },
      async execute(args) {
        return sandboxRequest("/read", {
          path: args.file_path,
          offset: args.offset,
          limit: args.limit,
        })
      },
    }),

    write: tool({
      description: "Write content to a file in the sandbox filesystem.",
      args: {
        file_path: tool.schema.string().describe("Absolute path to the file"),
        content: tool.schema.string().describe("Content to write"),
      },
      async execute(args) {
        return sandboxRequest("/write", {
          path: args.file_path,
          content: args.content,
        })
      },
    }),

    edit: tool({
      description: "Edit a file in the sandbox by replacing text.",
      args: {
        file_path: tool.schema.string().describe("Absolute path to the file"),
        old_string: tool.schema.string().describe("Text to replace"),
        new_string: tool.schema.string().describe("Replacement text"),
      },
      async execute(args) {
        return sandboxRequest("/edit", {
          path: args.file_path,
          old_string: args.old_string,
          new_string: args.new_string,
        })
      },
    }),
  }
}
