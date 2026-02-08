import { createSimpleContext } from "@opencode-ai/ui/context"
import { createStore } from "solid-js/store"

export interface ProcessedDocument {
  markdown: string
  images: { path: string; url: string }[]
  originalName: string
  timestamp: string
}

interface PaddleResponse {
  result: {
    layoutParsingResults: Array<{
      markdown: {
        text: string
        images: Record<string, string>
      }
    }>
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data:xxx;base64, prefix
      resolve(result.split(",")[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const { use: useDocumentProcessor, provider: DocumentProcessorProvider } = createSimpleContext({
  name: "DocumentProcessor",
  init: () => {
    const [state, setState] = createStore({
      processing: false,
      progress: 0,
      error: null as string | null,
      documents: [] as ProcessedDocument[],
    })

    async function processDocument(file: File): Promise<ProcessedDocument> {
      setState({ processing: true, progress: 0, error: null })

      try {
        // Convert file to base64
        const fileData = await fileToBase64(file)
        setState("progress", 30)

        // Determine file type: 0 = PDF, 1 = image
        const fileType = file.type.includes("pdf") ? 0 : 1

        // Call Paddle API
        const response = await fetch(import.meta.env.VITE_PADDLE_API_URL, {
          method: "POST",
          headers: {
            Authorization: `token ${import.meta.env.VITE_PADDLE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            file: fileData,
            fileType,
            useDocOrientationClassify: false,
            useDocUnwarping: false,
            useChartRecognition: false,
          }),
        })

        setState("progress", 70)

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }

        const result = (await response.json()) as PaddleResponse
        setState("progress", 90)

        const parsed = result.result.layoutParsingResults[0]
        if (!parsed) {
          throw new Error("No parsing results returned from API")
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

        const doc: ProcessedDocument = {
          markdown: parsed.markdown.text,
          images: Object.entries(parsed.markdown.images || {}).map(([path, url]) => ({
            path,
            url: url as string,
          })),
          originalName: file.name,
          timestamp,
        }

        setState("documents", (prev) => [...prev, doc])
        setState("progress", 100)

        return doc
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "Unknown error"
        setState("error", errorMsg)
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
