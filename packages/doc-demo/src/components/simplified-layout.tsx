import { ParentProps, Show } from "solid-js"
import { useServer } from "@/context/server-fixed"
import DocUpload from "./doc-upload"

export default function SimplifiedLayout(props: ParentProps) {
  const server = useServer()

  return (
    <div class="flex flex-col h-screen bg-background-base">
      {/* Simplified header */}
      <header class="h-12 border-b border-border-base flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-14-semibold text-color-primary">Doc Demo</span>
          <Show when={server.healthy() === false}>
            <span class="text-color-danger text-12-regular flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-color-danger" />
              Server Offline
            </span>
          </Show>
          <Show when={server.healthy() === true}>
            <span class="text-color-success text-12-regular flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-color-success" />
              Connected
            </span>
          </Show>
          <Show when={server.healthy() === undefined}>
            <span class="text-color-secondary text-12-regular flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-color-secondary animate-pulse" />
              Connecting...
            </span>
          </Show>
        </div>
        <div class="flex items-center gap-2">
          <DocUpload />
          <span class="text-12-regular text-color-tertiary">{server.directory}</span>
        </div>
      </header>

      {/* Main content area */}
      <main class="flex-1 overflow-hidden">{props.children}</main>
    </div>
  )
}
