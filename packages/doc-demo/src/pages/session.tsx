import { createEffect, createMemo, For, Show, onMount } from "solid-js"
import { useParams, useNavigate } from "@solidjs/router"
import { createOpencodeClient, type FileNode, type Part } from "@opencode-ai/sdk/v2/client"
import { createStore } from "solid-js/store"
import { useServer } from "@/context/server-fixed"
import { useGlobalSDK, useGlobalSync } from "@/context/global"
import { useDocumentProcessor } from "@/context/document-processor"
import { parseModel, parseVariant, rules } from "@/context/session-config"
import { Button } from "@opencode-ai/ui/button"
import { Markdown } from "@opencode-ai/ui/markdown"
import { showToast } from "@opencode-ai/ui/toast"

type Flow = {
  id: string
  label: string
  detail: string
  files: string[]
}

const byID = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const byPath = (a: { path: string }, b: { path: string }) =>
  a.path < b.path ? -1 : a.path > b.path ? 1 : 0

const states = {
  completed: "完成",
  running: "执行中",
  pending: "等待中",
  queued: "排队中",
  failed: "失败",
} as const

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
    })
  )

  const [store, setStore] = globalSync.child(directory())

  const [localState, setLocalState] = createStore({
    input: "",
    sending: false,
    currentSessionID: params.id || null,
  })

  const [view, setView] = createStore({
    filesLoading: false,
    files: [] as FileNode[],
    openPath: "",
    openType: "" as "" | "text" | "binary",
    openText: "",
    openLoading: false,
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

  const flow = createMemo(() => {
    const sessionID = localState.currentSessionID
    if (!sessionID) return [] as Flow[]
    const parts = messages().flatMap((item) => getParts(item.id)) as Part[]
    return parts
      .map((item) => {
        if (item.type === "tool") {
          const name = item.state.status === "running" && item.state.title ? item.state.title : item.tool
          const detail = states[item.state.status as keyof typeof states] ?? item.state.status
          const files =
            item.state.status === "completed"
              ? (item.state.attachments ?? [])
                  .flatMap((attachment) => {
                    if (!attachment.source) return []
                    if (attachment.source.type === "resource") return []
                    return [attachment.source.path]
                  })
                  .filter((path, index, list) => list.indexOf(path) === index)
              : []
          return {
            id: item.id,
            label: `工具 · ${name}`,
            detail,
            files,
          }
        }

        if (item.type === "patch") {
          return {
            id: item.id,
            label: "补丁",
            detail: `已更新 ${item.files.length} 个文件`,
            files: item.files,
          }
        }

        if (item.type === "file") {
          const path = item.source && item.source.type !== "resource" ? item.source.path : undefined
          return {
            id: item.id,
            label: "文件",
            detail: item.filename ?? path ?? item.url,
            files: path ? [path] : [],
          }
        }

        if (item.type === "subtask") {
          return {
            id: item.id,
            label: "子任务",
            detail: item.description || item.prompt,
            files: [],
          }
        }

        if (item.type === "step-start") {
          return {
            id: item.id,
            label: "步骤",
            detail: "开始",
            files: [],
          }
        }

        if (item.type === "step-finish") {
          return {
            id: item.id,
            label: "步骤",
            detail: `完成 · ${item.reason}`,
            files: [],
          }
        }

        if (item.type === "agent") {
          return {
            id: item.id,
            label: "智能体",
            detail: item.name,
            files: [],
          }
        }

        return
      })
      .filter((item): item is Flow => !!item)
  })

  // Create new session
  const createSession = async () => {
    try {
      const response = await sdk().session.create({ permission: rules(directory()) })
      const session = response.data
      if (session) {
        setLocalState("currentSessionID", session.id)
        navigate(`/session/${session.id}`)
        // Load messages for new session
        await loadMessages(session.id)
      }
    } catch (e) {
      showToast({ variant: "error", title: "创建会话失败", description: String(e) })
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
          .map((item) => item.info)
          .filter((item) => !!item?.id)
          .sort(byID),
      )
      
      for (const item of items) {
        setStore(
          "part",
          item.info.id,
          item.parts
            .filter((part) => !!part?.id)
            .sort(byID),
        )
      }
    } catch (e) {
      console.error("加载消息失败:", e)
    }
  }

  const openFile = async (path: string) => {
    if (!path) return
    setView("openPath", path)
    setView("openLoading", true)
    setView("openText", "")
    try {
      const response = await sdk().file.read({ path })
      const data = response.data
      if (!data) {
        setView("openType", "")
        return
      }
      setView("openType", data.type)
      setView("openText", data.content)
    } catch (e) {
      showToast({ variant: "error", title: "打开文件失败", description: String(e) })
      setView("openType", "")
    } finally {
      setView("openLoading", false)
    }
  }

  const loadFiles = async () => {
    setView("filesLoading", true)
    const seen = new Set<string>()
    const queue = ["."]
    const all: FileNode[] = []
    try {
      while (queue.length > 0) {
        const path = queue.shift()
        if (!path) continue
        const response = await sdk().file.list({ path })
        const nodes = response.data ?? []
        const ready = nodes
          .filter((item) => !item.ignored)
          .filter((item) => {
            if (seen.has(item.path)) return false
            seen.add(item.path)
            return true
          })
        all.push(...ready)
        queue.push(...ready.filter((item) => item.type === "directory").map((item) => item.path))
        if (all.length > 2000) break
      }

      const files = all
        .filter((item) => item.type === "file")
        .sort(byPath)
      setView("files", files)
      if (!view.openPath && files.length > 0) {
        await openFile(files[0].path)
      }
    } catch (e) {
      showToast({ variant: "error", title: "读取文件列表失败", description: String(e) })
      setView("files", [])
    } finally {
      setView("filesLoading", false)
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
      const docs = processor.state.documents
      const context =
        docs.length > 0
          ? docs.map((doc) => `## 文档：${doc.originalName}\n\n${doc.markdown}`).join("\n\n---\n\n")
          : ""
      const messageContent = context ? `${input}\n\n---\n\n### 已上传文档：\n\n${context}` : input
      const model = parseModel(import.meta.env.VITE_DEFAULT_MODEL)
      const variant = parseVariant(import.meta.env.VITE_DEFAULT_VARIANT)

      await sdk().session.prompt({
        sessionID,
        variant,
        parts: [{ type: "text", text: messageContent }],
        ...(model ? { model } : {}),
      })

      // Reload messages
      await loadMessages(sessionID)
      await loadFiles()
    } catch (e) {
      showToast({ variant: "error", title: "发送消息失败", description: String(e) })
    } finally {
      setLocalState("sending", false)
    }
  }

  // Load initial session
  onMount(() => {
    loadFiles()
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
    <div class="grid h-full min-h-0 grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_320px] bg-background-secondary">
      <section class="flex min-h-0 min-w-0 flex-col border-r border-border-weak-base bg-background-base">
        <div class="flex items-center justify-between border-b border-border-weak-base px-4 py-2">
          <span class="text-12-semibold text-text-strong">对话</span>
          <Show when={processor.state.documents.length > 0}>
            <span class="text-11-regular text-text-weak">
              已准备 {processor.state.documents.length} 个文档
            </span>
          </Show>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <Show when={!localState.currentSessionID}>
            <div class="flex flex-col items-center justify-center h-full gap-4 text-center">
              <h2 class="text-18-semibold text-text-strong">欢迎使用 Doc Demo</h2>
              <p class="text-text-weak">上传文档并开始提问</p>
              <Button onClick={createSession}>新建会话</Button>
            </div>
          </Show>

          <Show when={localState.currentSessionID}>
            <Show when={messages().length === 0}>
              <div class="text-center text-text-weak py-8">暂无消息，开始对话吧。</div>
            </Show>

            <For each={messages()}>
              {(message) => (
                <div
                  class={`rounded-xl border border-border-weak-base px-4 py-3 ${
                    message.role === "user"
                      ? "bg-surface-base ml-8"
                      : "bg-background-secondary mr-8"
                  }`}
                >
                  <div class="text-11-regular text-text-weak mb-2">
                    {message.role === "user" ? "你" : "智能体"}
                  </div>
                  <For each={(getParts(message.id) as Part[]).filter((part) => part.type === "text")}>
                    {(part) => (
                      <div class="prose prose-sm max-w-none">
                        <Markdown text={part.text || ""} />
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>
          </Show>
        </div>

        <div class="p-4 border-t border-border-weak-base bg-background-base">
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
              placeholder="输入你的问题…（Shift+Enter 换行）"
              class="flex-1 resize-none rounded-lg border border-border-weak-base bg-background-base p-3 text-14-regular text-text-strong focus:border-border-base focus:outline-none"
              rows={3}
              disabled={localState.sending}
            />
            <Button onClick={sendMessage} disabled={localState.sending || !localState.input.trim()}>
              {localState.sending ? "发送中..." : "发送"}
            </Button>
          </div>
        </div>
      </section>

      <section class="flex min-h-0 min-w-0 flex-col border-r border-border-weak-base bg-background-base">
        <div class="border-b border-border-weak-base bg-background-secondary p-3 text-12-semibold text-text-strong">
          执行流程
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
          <Show when={flow().length > 0} fallback={<div class="text-12-regular text-text-weak">暂无执行记录。</div>}>
            <For each={flow()}>
              {(item) => (
                <div class="rounded-md border border-border-weak-base bg-background-base p-2">
                  <div class="text-12-semibold text-text-strong">{item.label}</div>
                  <div class="text-11-regular text-text-weak mt-1">{item.detail}</div>
                  <Show when={item.files.length > 0}>
                    <div class="mt-2 flex flex-wrap gap-1">
                      <For each={item.files}>
                        {(path) => (
                          <button
                            type="button"
                            class="rounded border border-border-weak-base px-2 py-0.5 text-11-regular text-text-strong hover:bg-background-secondary"
                            onClick={() => openFile(path)}
                          >
                            {path}
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              )}
            </For>
          </Show>
        </div>

        <div class="border-t border-border-weak-base bg-background-secondary p-3 text-12-semibold text-text-strong">
          文件预览
        </div>
        <div class="h-[45%] min-h-0 overflow-y-auto p-3">
          <Show when={view.openPath} fallback={<div class="text-12-regular text-text-weak">选择文件以预览。</div>}>
            <div class="text-11-regular text-text-weak mb-2">{view.openPath}</div>
            <Show
              when={view.openLoading}
              fallback={
                <Show
                  when={view.openType === "binary"}
                  fallback={<pre class="text-11-regular whitespace-pre-wrap break-words text-text-strong">{view.openText}</pre>}
                >
                  <div class="text-12-regular text-text-weak">暂不支持二进制文件预览。</div>
                </Show>
              }
            >
              <div class="text-12-regular text-text-weak">正在加载文件...</div>
            </Show>
          </Show>
        </div>
      </section>

      <aside class="flex min-h-0 min-w-0 flex-col bg-background-base">
        <div class="flex items-center justify-between border-b border-border-weak-base bg-background-secondary p-3">
          <span class="text-12-semibold text-text-strong">所有文件</span>
          <Button size="small" variant="secondary" onClick={loadFiles} disabled={view.filesLoading}>
            {view.filesLoading ? "加载中..." : "刷新"}
          </Button>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          <Show when={view.files.length > 0} fallback={<div class="text-12-regular text-text-weak p-2">暂无文件。</div>}>
            <For each={view.files}>
              {(item) => (
                <button
                  type="button"
                  class={`block w-full rounded px-2 py-1 text-left text-11-regular hover:bg-background-secondary ${
                    view.openPath === item.path ? "bg-background-secondary text-text-strong" : "text-text-weak"
                  }`}
                  onClick={() => openFile(item.path)}
                >
                  {item.path}
                </button>
              )}
            </For>
          </Show>
        </div>
      </aside>
    </div>
  )
}
