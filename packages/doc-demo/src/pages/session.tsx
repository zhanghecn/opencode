import { createEffect, createMemo, Show, For, onMount } from "solid-js"
import { useParams, useNavigate } from "@solidjs/router"
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { createStore, produce, reconcile } from "solid-js/store"
import { useServer } from "@/context/server-fixed"
import { useGlobalSDK, useGlobalSync } from "@/context/global"
import { useDocumentProcessor } from "@/context/document-processor"
import { Button } from "@opencode-ai/ui/button"
import { Markdown } from "@opencode-ai/ui/markdown"
import { showToast } from "@opencode-ai/ui/toast"

export default function SessionPage() {
  const params = useParams()
  const navigate = useNavigate()
  const server = useServer()
  const globalSDK = useGlobalSDK()
  const globalSync = useGlobalSync()
  const processor = useDocumentProcessor()

  const directory = () => server.directory

  const sdk = createMemo(() =>
    createOpencodeClient({
      baseUrl: globalSDK.url,
      directory: directory(),
      throwOnError: true,
    }),
  )

  const [store, setStore] = globalSync.child(directory())

  const [localState, setLocalState] = createStore({
    input: "",
    sending: false,
    currentSessionID: params.id || null,
  })

  // Current session messages
  const messages = createMemo(() => {
    const sessionID = localState.currentSessionID
    if (!sessionID) return []
    return store.message[sessionID] || []
  })

  // Get parts for a message
  const getParts = (messageID: string) => {
    return store.part[messageID] || []
  }

  // Create new session
  const createSession = async () => {
    try {
      const response = await sdk().session.create({})
      const session = response.data
      if (session) {
        setLocalState("currentSessionID", session.id)
        navigate(`/session/${session.id}`)
        // Load messages for new session
        await loadMessages(session.id)
      }
    } catch (e) {
      showToast({ variant: "error", title: "Failed to create session", description: String(e) })
    }
  }

  // Load messages for a session
  const loadMessages = async (sessionID: string) => {
    try {
      const response = await sdk().session.messages({ sessionID, limit: 100 })
      const items = response.data ?? []

      setStore(
        "message",
        sessionID,
        items
          .map((x) => x.info)
          .filter((m) => !!m?.id)
          .sort((a, b) => (a.id < b.id ? -1 : 1)),
      )

      for (const item of items) {
        setStore(
          "part",
          item.info.id,
          item.parts.filter((p) => !!p?.id).sort((a, b) => (a.id < b.id ? -1 : 1)),
        )
      }
    } catch (e) {
      console.error("Failed to load messages:", e)
    }
  }

  // Send message
  const sendMessage = async () => {
    const input = localState.input.trim()
    if (!input || localState.sending) return

    let sessionID = localState.currentSessionID

    // Create session if needed
    if (!sessionID) {
      await createSession()
      sessionID = localState.currentSessionID
      if (!sessionID) return
    }

    setLocalState("sending", true)
    setLocalState("input", "")

    try {
      // Add documents context if available
      let messageContent = input
      if (processor.state.documents.length > 0) {
        const docContext = processor.state.documents
          .map((d) => `## Document: ${d.originalName}\n\n${d.markdown}`)
          .join("\n\n---\n\n")
        messageContent = `${input}\n\n---\n\n### Uploaded Documents:\n\n${docContext}`
      }

      await sdk().session.chat({
        sessionID,
        parts: [{ type: "text", text: messageContent }],
      })

      // Reload messages
      await loadMessages(sessionID)
    } catch (e) {
      showToast({ variant: "error", title: "Failed to send message", description: String(e) })
    } finally {
      setLocalState("sending", false)
    }
  }

  // Load initial session
  onMount(() => {
    if (params.id) {
      setLocalState("currentSessionID", params.id)
      loadMessages(params.id)
    }
  })

  // Watch for session changes
  createEffect(() => {
    if (params.id && params.id !== localState.currentSessionID) {
      setLocalState("currentSessionID", params.id)
      loadMessages(params.id)
    }
  })

  return (
    <div class="flex flex-col h-full">
      {/* Message list */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <Show when={!localState.currentSessionID}>
          <div class="flex flex-col items-center justify-center h-full gap-4">
            <h2 class="text-18-semibold text-color-primary">Welcome to Doc Demo</h2>
            <p class="text-color-secondary">Upload documents and start chatting with AI</p>
            <Button onClick={createSession}>Start New Session</Button>
          </div>
        </Show>

        <Show when={localState.currentSessionID}>
          <Show when={messages().length === 0}>
            <div class="text-center text-color-tertiary py-8">No messages yet. Start the conversation!</div>
          </Show>

          <For each={messages()}>
            {(message) => (
              <div
                class={`p-4 rounded-lg ${
                  message.role === "user" ? "bg-background-secondary ml-8" : "bg-background-tertiary mr-8"
                }`}
              >
                <div class="text-11-regular text-color-tertiary mb-2">
                  {message.role === "user" ? "You" : "Assistant"}
                </div>
                <For each={getParts(message.id)}>
                  {(part) => (
                    <Show when={part.type === "text"}>
                      <div class="prose prose-sm max-w-none">
                        <Markdown content={(part as any).text || ""} />
                      </div>
                    </Show>
                  )}
                </For>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Document status */}
      <Show when={processor.state.documents.length > 0}>
        <div class="px-4 py-2 bg-background-secondary border-t border-border-base">
          <div class="text-11-regular text-color-secondary">
            {processor.state.documents.length} document(s) ready for context
          </div>
        </div>
      </Show>

      {/* Input area */}
      <div class="p-4 border-t border-border-base">
        <div class="flex gap-2">
          <textarea
            value={localState.input}
            onInput={(e) => setLocalState("input", e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            class="flex-1 resize-none rounded-lg border border-border-base bg-background-base p-3 text-14-regular focus:border-color-primary focus:outline-none"
            rows={3}
            disabled={localState.sending}
          />
          <Button onClick={sendMessage} disabled={localState.sending || !localState.input.trim()}>
            {localState.sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  )
}
