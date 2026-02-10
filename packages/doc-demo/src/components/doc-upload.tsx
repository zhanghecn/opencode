import { Show, createSignal } from "solid-js"
import { useDocumentProcessor } from "@/context/document-processor"
import { showToast } from "@opencode-ai/ui/toast"
import { Button } from "@opencode-ai/ui/button"

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/markdown",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
  "image/tiff",
].join(",")

export default function DocUpload() {
  const processor = useDocumentProcessor()
  const [isDragging, setIsDragging] = createSignal(false)
  let inputRef: HTMLInputElement | undefined

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    for (const file of Array.from(files)) {
      try {
        const doc = await processor.processDocument(file)
        showToast({
          variant: "success",
          title: "解析完成",
          description: `${doc.originalName} 已转换为 Markdown。`,
        })
      } catch (err) {
        showToast({
          variant: "error",
          title: "解析失败",
          description: err instanceof Error ? err.message : "未知错误",
        })
      }
    }
  }

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement
    handleFiles(input.files)
    input.value = "" // Reset to allow selecting the same file again
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer?.files ?? null)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  return (
    <div
      class="flex items-center gap-2"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleFileChange}
        class="hidden"
        id="doc-upload"
        multiple
      />
      <Button
        size="small"
        variant={isDragging() ? "primary" : "secondary"}
        onClick={() => inputRef?.click()}
        disabled={processor.state.processing}
      >
        <Show when={processor.state.processing} fallback="上传文档">
          解析中... {processor.state.progress}%
        </Show>
      </Button>
      <Show when={processor.state.error}>
        <span class="text-12-regular text-color-danger">
          错误：{processor.state.error}
        </span>
      </Show>
      <span class="text-11-regular text-text-weak">
        支持 PDF / PPT / Excel / Word / 图片
      </span>
    </div>
  )
}
