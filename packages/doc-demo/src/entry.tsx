// @refresh reload
import { render } from "solid-js/web"
import App from "@/app"
import { Platform, PlatformProvider } from "@app/context/platform"
import pkg from "../package.json"

const root = document.getElementById("root")
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error("Root element not found. Is the HTML file correct?")
}

const platform: Platform = {
  platform: "web",
  version: pkg.version,
  openLink(url: string) {
    window.open(url, "_blank")
  },
  back() {
    window.history.back()
  },
  forward() {
    window.history.forward()
  },
  restart: async () => {
    window.location.reload()
  },
  notify: async (title, description, href) => {
    if (!("Notification" in window)) return

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission().catch(() => "denied")
        : Notification.permission

    if (permission !== "granted") return

    const inView = document.visibilityState === "visible" && document.hasFocus()
    if (inView) return

    await Promise.resolve()
      .then(() => {
        const notification = new Notification(title, {
          body: description ?? "",
          icon: "https://opencode.ai/favicon-96x96-v3.png",
        })
        notification.onclick = () => {
          window.focus()
          if (href) {
            window.history.pushState(null, "", href)
            window.dispatchEvent(new PopStateEvent("popstate"))
          }
          notification.close()
        }
      })
      .catch(() => undefined)
  },
  // No server selection needed - fixed server
  getDefaultServerUrl: () => null,
  setDefaultServerUrl: () => {},
}

render(
  () => (
    <PlatformProvider value={platform}>
      <App />
    </PlatformProvider>
  ),
  root!,
)
