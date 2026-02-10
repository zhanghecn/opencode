import { createSimpleContext } from "@opencode-ai/ui/context"
import { createStore } from "solid-js/store"
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { useServer } from "./server-fixed"
import { store } from "./document-storage"

export interface ProcessedDocument {
  markdown: string
  images: { path: string; url: string }[]
  originalName: string
  timestamp: string
  saved: {
    markdown: string
    images: string[]
  }
}

type ParseResult = {
  status?: string
  markdown?: string[]
  image_mapping?: Record<string, string> | Array<Record<string, string>>
  error?: {
    code?: string
    message?: string
    detail?: string
  }
}

const exts = new Set([
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".xls",
  ".xlsx",
  ".csv",
  ".md",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".tif",
  ".tiff",
  ".webp",
])

const ext = (name: string) => {
  const i = name.lastIndexOf(".")
  if (i === -1) return ""
  return name.slice(i).toLowerCase()
}

const safe = (value: string) => value.replace(/[^a-zA-Z0-9._/-]/g, "_")

const mapImages = (mapping: ParseResult["image_mapping"]) => {
  if (!mapping) return [] as { path: string; url: string }[]
  if (!Array.isArray(mapping)) {
    return Object.entries(mapping).map(([path, url]) => ({ path, url }))
  }
  return mapping.flatMap((item, page) =>
    Object.entries(item ?? {}).map(([path, url]) => ({ path: `page-${page + 1}/${path}`, url })),
  )
}

const parseBase = "/api"

export const parseApi = (value?: string) => {
  const raw = (value ?? "").trim()
  const base = (raw ? raw : parseBase).replace(/\/+$/, "")
  if (!base) return "/api/v1/parse"
  if (base.endsWith("/api/v1/parse")) return base
  if (base.endsWith("/api")) return `${base}/v1/parse`
  return `${base}/api/v1/parse`
}

export const { use: useDocumentProcessor, provider: DocumentProcessorProvider } = createSimpleContext({
  name: "DocumentProcessor",
  init: () => {
    const server = useServer()
    const sdk = createOpencodeClient({
      baseUrl: server.url,
      directory: server.directory,
      throwOnError: true,
    })
    const [state, setState] = createStore({
      processing: false,
      progress: 0,
      error: null as string | null,
      documents: [] as ProcessedDocument[],
    })

    async function processDocument(file: File): Promise<ProcessedDocument> {
      setState({ processing: true, progress: 0, error: null })

      try {
        if (!exts.has(ext(file.name))) {
          throw new Error(`不支持的文件类型：${file.name}`)
        }

        const url = parseApi()
        const form = new FormData()
        form.append("file", file)
        setState("progress", 20)

        const response = await fetch(url, {
          method: "POST",
          headers: import.meta.env.VITE_DOC_PARSE_API_TOKEN
            ? {
                Authorization: `Bearer ${import.meta.env.VITE_DOC_PARSE_API_TOKEN}`,
              }
            : undefined,
          body: form,
        })

        setState("progress", 60)

        if (!response.ok) {
          const text = await response.text().catch(() => "")
          throw new Error(`解析服务错误：${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`)
        }

        const result = (await response.json()) as ParseResult
        if (result.status && result.status !== "success") {
          throw new Error(result.error?.message || result.error?.detail || "解析失败")
        }

        const markdown = (result.markdown ?? []).join("\n\n").trim()
        if (!markdown) throw new Error("解析服务返回空的 Markdown")

        const images = mapImages(result.image_mapping)
        const timestamp = new Date().toISOString().replace(/[.:]/g, "-")

        setState("progress", 80)

        const saved = await store({
          sdk,
          root: server.directory,
          originalName: file.name,
          timestamp,
          markdown,
          images,
        })

        setState("progress", 95)

        const doc: ProcessedDocument = {
          markdown: markdown
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, path) => {
              const next = saved.images.find((item) => item.endsWith(safe(path)))
              if (!next) return `![${alt}](${path})`
              return `![${alt}](${next})`
            }),
          images,
          originalName: file.name,
          timestamp,
          saved,
        }

        setState("documents", (prev) => [...prev, doc])
        setState("progress", 100)

        return doc
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        setState("error", message)
        throw e
      } finally {
        setState("processing", false)
      }
    }

    function clearDocuments() {
      setState("documents", [])
    }

    function clearError() {
      setState("error", null)
    }

    return {
      state,
      processDocument,
      clearDocuments,
      clearError,
    }
  },
})
