import type { Hooks } from "@opencode-ai/plugin"

/**
 * Observability / Tracing plugin
 *
 * Monitors tool calls, LLM messages, and sub-agent dispatches.
 * All events are structured JSON lines written to stdout (or a file),
 * tagged with agent name, session, and parent-child trace IDs.
 *
 * Each "trace" represents one user request → agent response cycle.
 * Sub-agent dispatches (tool === "task") create child spans linked
 * to the parent via parentSpanID.
 */

type Span = {
  traceID: string
  spanID: string
  parentSpanID?: string
  agentName: string
  sessionID: string
  type: "tool_call" | "tool_result" | "llm_message" | "subagent_dispatch" | "subagent_result"
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
}

// In-flight spans keyed by sessionID:callID
const inflightSpans = new Map<string, Span>()

// Session → current traceID mapping
const sessionTraces = new Map<string, string>()

// Session → agent name mapping (populated via config or env)
const sessionAgents = new Map<string, string>()

function generateID(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function getTraceID(sessionID: string): string {
  let tid = sessionTraces.get(sessionID)
  if (!tid) {
    tid = generateID()
    sessionTraces.set(sessionID, tid)
  }
  return tid
}

function getAgentName(sessionID: string): string {
  return sessionAgents.get(sessionID) || process.env.OPENAGENT_NAME || "unknown"
}

function emitSpan(span: Span) {
  const logLine = JSON.stringify({
    ...span,
    _ts: new Date(span.startTime).toISOString(),
    _type: "openagent_trace",
  })

  const dest = process.env.OPENAGENT_TRACE_OUTPUT
  if (dest === "stderr") {
    process.stderr.write(logLine + "\n")
  } else {
    // Default: stdout, compatible with structured log collectors
    process.stdout.write(logLine + "\n")
  }
}

export function createTracingHooks(): Pick<Hooks, "event" | "tool.execute.before" | "tool.execute.after" | "chat.message"> {
  return {
    // Track new sessions → agent name from directory
    event: async ({ event }) => {
      if (event.type === "session.updated") {
        const props = event.properties as Record<string, any>
        if (props?.sessionID) {
          // Extract agent name from directory path: .../agents/{env}/{name}/
          const dir = process.cwd()
          const parts = dir.split("/")
          const agentsIdx = parts.indexOf("agents")
          if (agentsIdx >= 0 && parts.length > agentsIdx + 2) {
            sessionAgents.set(props.sessionID, parts[agentsIdx + 2]!)
          }
        }
      }

      // New user message → new trace
      // @ts-expect-error message.created may not be in the Event type union yet
      if (event.type === "message.created") {
        const props = (event as any).properties as Record<string, any>
        if (props?.sessionID && props?.role === "user") {
          // Start new trace for this user turn
          sessionTraces.set(props.sessionID, generateID())
        }
      }
    },

    // Before tool execution: create span
    "tool.execute.before": async (input, _output) => {
      const { tool, sessionID, callID } = input
      const traceID = getTraceID(sessionID)
      const agentName = getAgentName(sessionID)

      const isSubagent = tool === "task"

      const span: Span = {
        traceID,
        spanID: generateID(),
        agentName,
        sessionID,
        type: isSubagent ? "subagent_dispatch" : "tool_call",
        name: tool,
        startTime: Date.now(),
      }

      // For sub-agent tasks, find parent span (the current agent context)
      // The parent is always the current trace root
      if (isSubagent) {
        span.parentSpanID = traceID // root of current trace
        span.metadata = {
          ...((_output as any)?.args || {}),
        }
      }

      const key = `${sessionID}:${callID}`
      inflightSpans.set(key, span)

      // Emit start event immediately for real-time monitoring
      emitSpan({ ...span, type: isSubagent ? "subagent_dispatch" : "tool_call" })
    },

    // After tool execution: complete span with result metadata
    "tool.execute.after": async (input, output) => {
      const { tool, sessionID, callID } = input
      const key = `${sessionID}:${callID}`
      const span = inflightSpans.get(key)

      if (span) {
        span.endTime = Date.now()
        span.duration = span.endTime - span.startTime

        const isSubagent = tool === "task"
        span.type = isSubagent ? "subagent_result" : "tool_result"
        span.metadata = {
          ...span.metadata,
          title: output.title,
          outputLength: typeof output.output === "string" ? output.output.length : 0,
          ...(output.metadata || {}),
        }

        emitSpan(span)
        inflightSpans.delete(key)
      }
    },

    // Track LLM messages (input/output)
    "chat.message": async (input, output) => {
      const { sessionID, agent, model } = input
      const traceID = getTraceID(sessionID)
      const agentName = getAgentName(sessionID)

      const span: Span = {
        traceID,
        spanID: generateID(),
        agentName,
        sessionID,
        type: "llm_message",
        name: agent || "default",
        startTime: Date.now(),
        metadata: {
          model,
          partsCount: output.parts?.length || 0,
          agent,
        },
      }

      emitSpan(span)
    },
  }
}
