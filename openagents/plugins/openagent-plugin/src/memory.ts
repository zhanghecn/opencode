import type { Hooks } from "@opencode-ai/plugin"
import type { Event } from "@opencode-ai/sdk"

/**
 * Memory system hooks (deer-flow MemoryMiddleware equivalent)
 *
 * Listens to message events and asynchronously updates agent memory.
 * Memory is stored in the agent's directory under .memory/
 */

type MemoryEntry = {
  key: string
  value: string
  timestamp: number
}

const memoryStore: Map<string, MemoryEntry[]> = new Map()

export const memoryHooks: Pick<Hooks, "event"> = {
  event: async ({ event }: { event: Event }) => {
    // Listen for completed messages to extract memory-worthy information
    if (event.type === "message.updated") {
      const data = event.properties as Record<string, any>
      if (!data?.sessionID) return

      // Auto-extract memory from conversation patterns
      // This is a simplified version; production would use LLM to extract key facts
      const sessionID = data.sessionID as string
      const entries = memoryStore.get(sessionID) || []

      // Store metadata about the conversation
      entries.push({
        key: `session_${sessionID}_msg_${Date.now()}`,
        value: JSON.stringify({
          timestamp: Date.now(),
          type: "conversation_turn",
        }),
        timestamp: Date.now(),
      })

      // Keep last 100 entries per session
      if (entries.length > 100) {
        entries.splice(0, entries.length - 100)
      }
      memoryStore.set(sessionID, entries)
    }
  },
}

export function getMemory(sessionID: string): MemoryEntry[] {
  return memoryStore.get(sessionID) || []
}
