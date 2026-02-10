import { createSimpleContext } from "@opencode-ai/ui/context"
import { createStore } from "solid-js/store"
import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { useServer } from "./server-fixed"

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
  ".xlsx",
  ".csv",
  ".md",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".tiff",
  ".webp",
])

const stem = (name: string) => {
  const i = name.lastIndexOf(".")
  if (i === -1) return name
  return name.slice(0, i)
}

const ext = (name: string) => {
  const i = name.lastIndexOf(".")
  if (i === -1) return ""
  return name.slice(i).toLowerCase()
}

const safe = (value: string) => value.replace(/[^a-zA-Z0-9._/-]/g, "_")

const fromBytes = (bytes: Uint8Array) => {
  let out = ""
  const size = 0x8000
  for (let i = 0; i < bytes.length; i += size) {
    out += String.fromCharCode(...bytes.subarray(i, i + size))
  }
  return out
}

const mapImages = (mapping: ParseResult["image_mapping"]) => {
  if (!mapping) return [] as { path: string; url: string }[]
  if (!Array.isArray(mapping)) {
    return Object.entries(mapping).map(([path, url]) => ({ path, url }))
  }
  return mapping.flatMap((item, page) =>
    Object.entries(item ?? {}).map(([path, url]) => ({ path: `page-${page + 1}/${path}`, url })),
  )
}

const raw = (value: string) => {
  const i = value.indexOf(",")
  if (value.startsWith("data:") && i !== -1) return value.slice(i + 1)
  return value
}

const toBytes = (value: string) => Uint8Array.from(atob(raw(value)), (char) => char.charCodeAt(0))

export const parseApi = (value: string) => {
  const base = (value || "").trim().replace(/\/+$/, "")
  if (!base) throw new Error("VITE_DOC_PARSE_API_URL is required")
  if (base.endsWith("/api/v1/parse")) return base
  return `${base}/api/v1/parse`
}

const permission = (root: string) => [
  {
    permission: "*",
    pattern: "*",
    action: "allow" as const,
  },
  {
    permission: "external_directory",
    pattern: `${root}/**`,
    action: "allow" as const,
  },
  {
    permission: "external_directory",
    pattern: "*",
    action: "deny" as const,
  },
]

async function shell(sdk: ReturnType<typeof createOpencodeClient>, sessionID: string, command: string) {
  await sdk.session.shell({
    sessionID,
    agent: "build",
    command,
  })
}

function quote(path: string) {
  return `'${path.replace(/'/g, `'\\''`)}'`
}

async function writeWorkspace(input: {
  sdk: ReturnType<typeof createOpencodeClient>
  root: string
  markdown: string
  images: { path: string; url: string }[]
  originalName: string
  timestamp: string
}) {
  const base = `${input.root}/.doc-demo/parsed`
  const folder = `${base}/${safe(stem(input.originalName) || "document")}-${input.timestamp}`
  const imageDir = `${folder}/images`
  const markdownPath = `${folder}/document.md`

  const session = await input.sdk.session.create({ permission: permission(input.root) })
  const sessionID = session.data?.id
  if (!sessionID) throw new Error("unable to create write session")

  await shell(input.sdk, sessionID, `mkdir -p ${quote(imageDir)}`)
  await shell(input.sdk, sessionID, `cat > ${quote(markdownPath)} <<'DOC_DEMO_MD'\n${input.markdown}\nDOC_DEMO_MD`)

  const paths: string[] = []
  for (const image of input.images) {
    const path = `${imageDir}/${safe(image.path || "image.bin")}`
    const dir = path.split("/").slice(0, -1).join("/")
    const data = btoa(fromBytes(toBytes(image.url)))
    await shell(
      input.sdk,
      sessionID,
      `mkdir -p ${quote(dir)} && printf %s ${quote(data)} | base64 --decode > ${quote(path)}`,
    )
    paths.push(path)
  }

  return {
    markdown: markdownPath,
    images: paths,
  }
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
          throw new Error(`Unsupported file type: ${file.name}`)
        }

        const url = parseApi(import.meta.env.VITE_DOC_PARSE_API_URL)
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
          throw new Error(`Parse API error: ${response.status} ${response.statusText}${text ? ` - ${text}` : ""}`)
        }

        const result = (await response.json()) as ParseResult
        if (result.status && result.status !== "success") {
          throw new Error(result.error?.message || result.error?.detail || "Parse failed")
        }

        const markdown = (result.markdown ?? []).join("\n\n").trim()
        if (!markdown) throw new Error("Parse API returned empty markdown")

        const images = mapImages(result.image_mapping)
        const timestamp = new Date().toISOString().replace(/[.:]/g, "-")

        setState("progress", 80)

        const saved = await writeWorkspace({
          sdk,
          root: server.directory,
          originalName: file.name,
          timestamp,
          markdown,
          images,
        })

        setState("progress", 95)

        const doc: ProcessedDocument = {
          markdown,
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
