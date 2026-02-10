import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"
import { resolve } from "path"
import { existsSync, readFileSync } from "fs"

// Get absolute paths for aliases
const docDemoSrc = fileURLToPath(new URL("./src", import.meta.url))
const appSrc = fileURLToPath(new URL("../app/src", import.meta.url))
const root = fileURLToPath(new URL("../..", import.meta.url))
const plan = resolve(root, "plan/文档解析api.json")
const info = existsSync(plan)
  ? (JSON.parse(readFileSync(plan, "utf8")) as {
      servers?: Array<{ url?: string }>
      paths?: Record<string, unknown>
    })
  : {}
const base = (info.servers?.[0]?.url ?? "").replace(/\/+$/, "")
const route = Object.keys(info.paths ?? {})[0] ?? ""
const endpoint = base && route ? `${base}${route.startsWith("/") ? "" : "/"}${route}` : ""

export default defineConfig({
  define: {
    __DOC_PARSE_URL__: JSON.stringify(endpoint),
  },
  plugins: [
    {
      name: "doc-demo:config",
      config() {
        return {
          resolve: {
            alias: [
              // Local src directory (higher priority)
              { find: "@/", replacement: docDemoSrc + "/" },
              { find: "@", replacement: docDemoSrc },
              // App src directory  
              { find: "@app/", replacement: appSrc + "/" },
              { find: "@app", replacement: appSrc },
            ],
          },
          worker: {
            format: "es" as const,
          },
        }
      },
    },
    tailwindcss(),
    solidPlugin(),
  ],
  server: {
    host: "0.0.0.0",
    port: 3001,
    allowedHosts: true,
  },
  build: {
    target: "esnext",
    rollupOptions: {
      // Handle the @/ imports inside @app files
      onwarn(warning, warn) {
        // Suppress warnings about circular dependencies in solid-js
        if (warning.code === "CIRCULAR_DEPENDENCY") return
        warn(warning)
      },
    },
  },
  // Resolve @/ in imported modules to their own directory
  optimizeDeps: {
    include: ["solid-js", "solid-js/web", "solid-js/store"],
  },
})
