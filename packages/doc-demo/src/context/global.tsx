import { createOpencodeClient, type Event, type Config, type Path, type Project } from "@opencode-ai/sdk/v2/client"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { createGlobalEmitter } from "@solid-primitives/event-bus"
import { batch, createEffect, onCleanup, onMount, type ParentProps, Show, Match, Switch } from "solid-js"
import { createContext, useContext, getOwner } from "solid-js"
import { createStore, produce, reconcile } from "solid-js/store"
import { useServer } from "./server-fixed"

// GlobalSDKProvider - simplified version
export const { use: useGlobalSDK, provider: GlobalSDKProvider } = createSimpleContext({
  name: "GlobalSDK",
  init: () => {
    const server = useServer()
    const abort = new AbortController()

    const eventSdk = createOpencodeClient({
      baseUrl: server.url,
      signal: abort.signal,
    })
    
    const emitter = createGlobalEmitter<{
      [key: string]: Event
    }>()

    // Event streaming
    void (async () => {
      try {
        const events = await eventSdk.global.event()
        for await (const event of events.stream) {
          const directory = event.directory ?? "global"
          emitter.emit(directory, event.payload)
        }
      } catch (e) {
        console.error("Event stream error:", e)
      }
    })()

    onCleanup(() => {
      abort.abort()
    })

    const sdk = createOpencodeClient({
      baseUrl: server.url,
      throwOnError: true,
    })

    return { 
      url: server.url, 
      client: sdk, 
      event: emitter,
    }
  },
})

// GlobalSyncProvider - simplified version
type GlobalStore = {
  ready: boolean
  error?: Error
  path: Path
  project: Project[]
  config: Config
}

type DirectoryStore = {
  status: "loading" | "ready" | "error"
  session: any[]
  message: Record<string, any[]>
  part: Record<string, any[]>
  agent: any[]
  permission: any[]
  lsp: any[]
  limit: number
  project: string
  path: Path
  sessionTotal: number
  session_diff: Record<string, any[]>
  todo: Record<string, any[]>
}

function createGlobalSync() {
  const globalSDK = useGlobalSDK()
  const server = useServer()
  const owner = getOwner()
  if (!owner) throw new Error("GlobalSync must be created within owner")

  const [globalStore, setGlobalStore] = createStore<GlobalStore>({
    ready: false,
    path: { state: "", config: "", worktree: "", directory: "", home: "" },
    project: [],
    config: {},
  })

  // Directory stores cache
  const directoryStores = new Map<string, ReturnType<typeof createStore<DirectoryStore>>>()

  const getDirectoryStore = (directory: string) => {
    if (!directoryStores.has(directory)) {
      const store = createStore<DirectoryStore>({
        status: "loading",
        session: [],
        message: {},
        part: {},
        agent: [],
        permission: [],
        lsp: [],
        limit: 20,
        project: "",
        path: { state: "", config: "", worktree: "", directory: "", home: "" },
        sessionTotal: 0,
        session_diff: {},
        todo: {},
      })
      directoryStores.set(directory, store)
      
      // Bootstrap directory
      bootstrapDirectory(directory, store[1])
    }
    return directoryStores.get(directory)!
  }

  async function bootstrapDirectory(directory: string, setStore: any) {
    try {
      const sdk = createOpencodeClient({
        baseUrl: globalSDK.url,
        directory,
        throwOnError: true,
      })

      // Load initial data
      const [pathRes, agentRes, sessionRes] = await Promise.all([
        sdk.global.path(),
        sdk.agent.list(),
        sdk.session.list({ limit: 20 }),
      ])

      batch(() => {
        setStore("path", pathRes.data)
        setStore("agent", agentRes.data ?? [])
        setStore("session", (sessionRes.data ?? []).sort((a: any, b: any) => 
          a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        ))
        setStore("status", "ready")
      })
    } catch (e) {
      console.error("Bootstrap error:", e)
      setStore("status", "error")
    }
  }

  async function bootstrap() {
    try {
      const [pathRes, configRes, projectRes] = await Promise.all([
        globalSDK.client.global.path(),
        globalSDK.client.global.config.get(),
        globalSDK.client.project.list(),
      ])

      batch(() => {
        setGlobalStore("path", pathRes.data)
        setGlobalStore("config", configRes.data ?? {})
        setGlobalStore("project", projectRes.data ?? [])
        setGlobalStore("ready", true)
      })
    } catch (e) {
      console.error("Global bootstrap error:", e)
      setGlobalStore("error", e instanceof Error ? e : new Error(String(e)))
    }
  }

  // Event handler
  const unsub = globalSDK.event.listen((e) => {
    const directory = e.name
    const event = e.details

    if (directory === "global") {
      // Handle global events
      return
    }

    const store = directoryStores.get(directory)
    if (!store) return

    const [, setStore] = store
    
    // Handle directory events
    if (event.type === "session.created") {
      setStore("session", produce((draft: any[]) => {
        const session = event.properties.session
        draft.push(session)
        draft.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      }))
    }
  })

  onCleanup(unsub)

  onMount(() => {
    bootstrap()
  })

  const child = (directory: string) => {
    const store = getDirectoryStore(directory)
    return store
  }

  return {
    data: globalStore,
    set: setGlobalStore,
    get ready() {
      return globalStore.ready
    },
    get error() {
      return globalStore.error
    },
    child,
    bootstrap,
    project: {
      loadSessions: async (directory: string) => {
        const [store, setStore] = getDirectoryStore(directory)
        const sdk = createOpencodeClient({
          baseUrl: globalSDK.url,
          directory,
          throwOnError: true,
        })
        const sessions = await sdk.session.list({ limit: store.limit })
        setStore("session", (sessions.data ?? []).sort((a: any, b: any) => 
          a.id < b.id ? -1 : a.id > b.id ? 1 : 0
        ))
      }
    }
  }
}

const GlobalSyncContext = createContext<ReturnType<typeof createGlobalSync>>()

export function GlobalSyncProvider(props: ParentProps) {
  const value = createGlobalSync()
  return (
    <Switch>
      <Match when={value.ready}>
        <GlobalSyncContext.Provider value={value}>{props.children}</GlobalSyncContext.Provider>
      </Match>
      <Match when={value.error}>
        <div class="flex items-center justify-center h-screen">
          <p class="text-color-danger">Failed to connect: {value.error?.message}</p>
        </div>
      </Match>
      <Match when={!value.ready}>
        <div class="flex items-center justify-center h-screen">
          <p class="text-color-secondary">Connecting to server...</p>
        </div>
      </Match>
    </Switch>
  )
}

export function useGlobalSync() {
  const context = useContext(GlobalSyncContext)
  if (!context) throw new Error("useGlobalSync must be used within GlobalSyncProvider")
  return context
}
