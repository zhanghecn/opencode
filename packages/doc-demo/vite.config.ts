import { defineConfig, loadEnv } from "vite"
import solidPlugin from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "url"

// Get absolute paths for aliases
const docDemoSrc = fileURLToPath(new URL("./src", import.meta.url))
const appSrc = fileURLToPath(new URL("../app/src", import.meta.url))
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const target = (env.VITE_DOC_PARSE_API_URL ?? "").trim()
  if (!target) throw new Error("VITE_DOC_PARSE_API_URL is required for the /api proxy")

  return {
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
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
        },
      },
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
  }
})
