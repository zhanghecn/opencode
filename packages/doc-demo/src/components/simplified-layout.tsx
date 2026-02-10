import { ParentProps, Show } from "solid-js"
import { Mark } from "@opencode-ai/ui/logo"
import { useServer } from "@/context/server-fixed"
import DocUpload from "./doc-upload"

export default function SimplifiedLayout(props: ParentProps) {
  const server = useServer()

  return (
    <div class="flex flex-col h-screen bg-background-base">
      <header class="h-12 border-b border-border-weak-base bg-background-base flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center gap-3">
          <Mark class="size-5 text-text-strong" />
          <span class="text-14-semibold text-text-strong">Doc Demo</span>
          <div class="flex items-center gap-2 rounded-full border border-border-weak-base bg-background-secondary px-2 py-1 text-11-regular text-text-weak">
            <Show when={server.healthy() === false}>
              <span class="w-2 h-2 rounded-full bg-color-danger" />
              <span>离线</span>
            </Show>
            <Show when={server.healthy() === true}>
              <span class="w-2 h-2 rounded-full bg-color-success" />
              <span>已连接</span>
            </Show>
            <Show when={server.healthy() === undefined}>
              <span class="w-2 h-2 rounded-full bg-color-secondary animate-pulse" />
              <span>连接中</span>
            </Show>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <DocUpload />
          <span class="text-11-regular text-text-weak truncate max-w-80">
            目录：{server.directory}
          </span>
        </div>
      </header>

      {/* Main content area */}
      <main class="flex-1 overflow-hidden">
        {props.children}
      </main>
    </div>
  )
}
