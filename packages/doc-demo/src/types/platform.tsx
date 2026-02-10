import { createSimpleContext } from "@opencode-ai/ui/context"

export type Platform = {
  platform: "web" | "desktop"
  os?: "macos" | "windows" | "linux"
  version?: string
  openLink(url: string): void
  openPath?(path: string, app?: string): Promise<void>
  restart(): Promise<void>
  back(): void
  forward(): void
  notify(title: string, description?: string, href?: string): Promise<void>
  openDirectoryPickerDialog?(opts?: { title?: string; multiple?: boolean }): Promise<string | string[] | null>
  openFilePickerDialog?(opts?: { title?: string; multiple?: boolean }): Promise<string | string[] | null>
  saveFilePickerDialog?(opts?: { title?: string; defaultPath?: string }): Promise<string | null>
  fetch?: typeof fetch
  getDefaultServerUrl?(): Promise<string | null> | string | null
  setDefaultServerUrl?(url: string | null): Promise<void> | void
  parseMarkdown?(markdown: string): Promise<string>
  checkAppExists?(appName: string): Promise<boolean>
}

export const { use: usePlatform, provider: PlatformProvider } = createSimpleContext({
  name: "Platform",
  init: (props: { value: Platform }) => {
    return props.value
  },
})
