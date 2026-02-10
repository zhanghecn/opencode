import { describe, expect, test } from "bun:test"
import { createOpencodeClient, type Part } from "@opencode-ai/sdk/v2/client"
import { fileURLToPath } from "url"
import { dirname, resolve, relative } from "path"
import { mkdir } from "fs/promises"
import { parseApi } from "../context/document-processor"
import { store } from "../context/document-storage"
import { rules } from "../context/session-config"

type ParseResult = {
  status?: string
  markdown?: string[]
  image_mapping?: Record<string, string> | Array<Record<string, string>>
}

const need = (key: string) => {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} is required for integration tests`)
  return value
}

const toList = (mapping: ParseResult["image_mapping"]) => {
  if (!mapping) return [] as { path: string; url: string }[]
  if (!Array.isArray(mapping)) {
    return Object.entries(mapping).map(([path, url]) => ({ path, url }))
  }
  return mapping.flatMap((item, page) =>
    Object.entries(item ?? {}).map(([path, url]) => ({ path: `page-${page + 1}/${path}`, url })),
  )
}

describe("document flow", () => {
  test("parses, stores, and generates a report", async () => {
    const base = need("VITE_DOC_PARSE_API_URL")
    const server = need("VITE_OPENCODE_SERVER_URL")
    const root = need("VITE_FIXED_DIRECTORY")

    await mkdir(root, { recursive: true })

    const here = dirname(fileURLToPath(import.meta.url))
    const pdf = resolve(here, "../../test_work/AI统一网关.pdf")
    const skills = resolve(here, "../../test_work/skills")

    const form = new FormData()
    form.append("file", Bun.file(pdf), "AI统一网关.pdf")

    const response = await fetch(parseApi(base), { method: "POST", body: form })
    expect(response.ok).toBe(true)

    const result = (await response.json()) as ParseResult
    const markdown = (result.markdown ?? []).join("\n\n").trim()
    expect(markdown.length).toBeGreaterThan(0)

    const sdk = createOpencodeClient({ baseUrl: server, directory: root, throwOnError: true })

    await sdk.config.update({
      config: {
        skills: {
          paths: [skills],
        },
      },
    })

    const list = await sdk.app.skills()
    const ready = (list.data ?? []).some((skill) => skill.name === "doc-coauthoring")
    expect(ready).toBe(true)

    const stamp = new Date().toISOString().replace(/[.:]/g, "-")
    const saved = await store({
      sdk,
      root,
      markdown,
      images: toList(result.image_mapping),
      originalName: "AI统一网关.pdf",
      timestamp: stamp,
    })

    const doc = relative(root, saved.markdown).replace(/\\/g, "/")
    const report = `report-${stamp}.md`

    const session = await sdk.session.create({ permission: rules(root) })
    const sessionID = session.data?.id
    expect(sessionID).toBeTruthy()
    if (!sessionID) return

    const prompt = [
      "请先加载 doc-coauthoring skill。",
      `阅读 ${doc} 并生成一份中文报告。`,
      `将报告保存到 ${report}（相对于工作目录）。`,
    ].join("\n")

    const reply = await sdk.session.prompt({
      sessionID,
      parts: [{ type: "text", text: prompt }],
    })

    const used = (reply.data?.parts ?? []).some(
      (part: Part) => part.type === "tool" && part.tool === "skill",
    )
    expect(used).toBe(true)

    const output = await sdk.file.read({ path: report })
    const content = output.data?.content ?? ""
    expect(content.trim().length).toBeGreaterThan(0)
  })
})
