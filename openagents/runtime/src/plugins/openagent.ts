import type { Plugin, Hooks } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"
import { createTracingHooks } from "./tracing"
import { memoryHooks } from "./memory"

/**
 * OpenAgents main plugin
 *
 * Provides deer-flow middleware equivalents via opencode hooks:
 * - MemoryMiddleware → event hook (async memory updates)
 * - ClarificationMiddleware → ask_clarification tool
 * - UploadsMiddleware → chat.message hook (inject uploaded_files)
 * - SubagentLimitMiddleware → tool.execute.before hook
 * - ViewImageMiddleware → view_image tool
 * - Tracing → tool/chat/event hooks (observability)
 */
export const openagentPlugin: Plugin = async (input) => {
  const sandboxMode = process.env.OPENAGENT_SANDBOX_MODE || "local"
  const maxSubagents = parseInt(process.env.OPENAGENT_MAX_SUBAGENTS || "5", 10)
  const tracingEnabled = process.env.OPENAGENT_TRACING !== "false"

  let activeSubagents = 0

  // Create tracing hooks if enabled
  const tracing = tracingEnabled ? createTracingHooks() : null

  const hooks: Hooks = {
    // Combined event hook: memory + tracing
    event: async (eventInput) => {
      await memoryHooks.event?.(eventInput)
      await tracing?.event?.(eventInput)
    },

    // Combined chat.message hook: uploads + tracing
    "chat.message": async (input, output) => {
      // Uploads middleware equivalent
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

      // Tracing
      await tracing?.["chat.message"]?.(input, output)
    },

    // Combined tool.execute.before: subagent limit + tracing
    "tool.execute.before": async (input, output) => {
      if (input.tool === "task") {
        if (activeSubagents >= maxSubagents) {
          throw new Error(`Maximum concurrent subagents (${maxSubagents}) reached. Wait for existing tasks to complete.`)
        }
        activeSubagents++
      }
      await tracing?.["tool.execute.before"]?.(input, output)
    },

    // Combined tool.execute.after: subagent tracking + tracing
    "tool.execute.after": async (input, output) => {
      if (input.tool === "task") {
        activeSubagents = Math.max(0, activeSubagents - 1)
      }
      await tracing?.["tool.execute.after"]?.(input, output)
    },

    // Register custom tools
    tool: {
      ask_clarification: tool({
        description: "Ask the user a clarifying question when the request is ambiguous. Use this instead of making assumptions.",
        args: {
          question: tool.schema.string().describe("The question to ask the user"),
          options: tool.schema.array(tool.schema.string()).optional().describe("Optional list of suggested answers"),
        },
        async execute(args) {
          return JSON.stringify({
            type: "clarification",
            question: args.question,
            options: args.options || [],
          })
        },
      }),

      view_image: tool({
        description: "Display an image to the user. Accepts a file path to an image.",
        args: {
          path: tool.schema.string().describe("Path to the image file"),
          caption: tool.schema.string().optional().describe("Optional caption for the image"),
        },
        async execute(args) {
          return JSON.stringify({
            type: "image",
            path: args.path,
            caption: args.caption || "",
          })
        },
      }),

      present_files: tool({
        description: "Present generated files (HTML, documents, code) to the user as downloadable artifacts.",
        args: {
          files: tool.schema.array(tool.schema.object({
            path: tool.schema.string().describe("File path"),
            type: tool.schema.string().describe("MIME type"),
            description: tool.schema.string().optional().describe("Description of the file"),
          })).describe("List of files to present"),
        },
        async execute(args) {
          return JSON.stringify({
            type: "present_files",
            files: args.files,
          })
        },
      }),

      // Conditionally include sandbox tools
      ...(sandboxMode !== "local" ? (await import("./sandbox")).sandboxTools() : {}),
    },
  }

  return hooks
}
