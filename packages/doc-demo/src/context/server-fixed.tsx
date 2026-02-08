import { createSimpleContext } from "@opencode-ai/ui/context"
import { createEffect, createMemo, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { checkServerHealth } from "@app/utils/server-health"

export function serverDisplayName(url: string) {
  if (!url) return ""
  return url.replace(/^https?:\/\//, "").replace(/\/+$/, "")
}

export const { use: useServer, provider: ServerProvider } = createSimpleContext({
  name: "ServerFixed",
  init: () => {
    const serverUrl = import.meta.env.VITE_OPENCODE_SERVER_URL || "http://localhost:4096"
    const fixedDirectory = import.meta.env.VITE_FIXED_DIRECTORY || "/work/documents"

    const [state, setState] = createStore({
      healthy: undefined as boolean | undefined,
    })

    // Health check
    createEffect(() => {
      let alive = true
      let busy = false

      const run = async () => {
        if (busy) return
        busy = true
        try {
          const result = await checkServerHealth(serverUrl, fetch)
          if (alive) setState("healthy", result.healthy)
        } finally {
          busy = false
        }
      }

      run()
      const interval = setInterval(run, 10_000)

      onCleanup(() => {
        alive = false
        clearInterval(interval)
      })
    })

    const isReady = createMemo(() => !!serverUrl)

    return {
      url: serverUrl,
      directory: fixedDirectory,
      healthy: () => state.healthy,
      ready: isReady,
      get name() {
        return serverDisplayName(serverUrl)
      },
      isLocal: () => true,
    }
  },
})
