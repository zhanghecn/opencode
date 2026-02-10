import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"
import { rules } from "./session-config"

const stem = (name: string) => {
  const i = name.lastIndexOf(".")
  if (i === -1) return name
  return name.slice(0, i)
}

const safe = (value: string) => value.replace(/[^a-zA-Z0-9._/-]/g, "_")

const raw = (value: string) => {
  const i = value.indexOf(",")
  if (value.startsWith("data:") && i !== -1) return value.slice(i + 1)
  return value
}

const toBytes = (value: string) => Uint8Array.from(atob(raw(value)), (char) => char.charCodeAt(0))

const fromBytes = (bytes: Uint8Array) => {
  let out = ""
  const size = 0x8000
  for (let i = 0; i < bytes.length; i += size) {
    out += String.fromCharCode(...bytes.subarray(i, i + size))
  }
  return out
}

const limit = 16000

export const chunk = (value: string, size = limit) => {
  if (!value) return [""]
  const parts = []
  for (let i = 0; i < value.length; i += size) {
    parts.push(value.slice(i, i + size))
  }
  return parts
}

const quote = (path: string) => `'${path.replace(/'/g, `'\\''`)}'`

const run = async (sdk: ReturnType<typeof createOpencodeClient>, id: string, command: string) => {
  await sdk.session.shell({
    sessionID: id,
    agent: "build",
    command,
  })
}

const writeText = (path: string, value: string, size = limit) => {
  const parts = chunk(value, size)
  return [`: > ${quote(path)}`, ...parts.map((part) => `printf %s ${quote(part)} >> ${quote(path)}`)]
}

const writeBase64 = (path: string, data: string, size = limit) => {
  const temp = `${path}.b64`
  return [
    ...writeText(temp, data, size),
    `base64 --decode < ${quote(temp)} > ${quote(path)}`,
    `rm -f ${quote(temp)}`,
  ]
}

export const store = async (input: {
  sdk: ReturnType<typeof createOpencodeClient>
  root: string
  markdown: string
  images: { path: string; url: string }[]
  originalName: string
  timestamp: string
}) => {
  const base = `${input.root}/.doc-demo/parsed`
  const folder = `${base}/${safe(stem(input.originalName) || "document")}-${input.timestamp}`
  const imageDir = `${folder}/images`
  const markdownPath = `${folder}/document.md`

  const session = await input.sdk.session.create({ permission: rules(input.root) })
  const id = session.data?.id
  if (!id) throw new Error("无法创建写入会话")

  await run(input.sdk, id, `mkdir -p ${quote(imageDir)}`)
  for (const cmd of writeText(markdownPath, input.markdown)) {
    await run(input.sdk, id, cmd)
  }

  const images = await Promise.all(
    input.images.map(async (image) => {
      const path = `${imageDir}/${safe(image.path || "image.bin")}`
      const dir = path.split("/").slice(0, -1).join("/")
      const data = btoa(fromBytes(toBytes(image.url)))
      await run(input.sdk, id, `mkdir -p ${quote(dir)}`)
      for (const cmd of writeBase64(path, data)) {
        await run(input.sdk, id, cmd)
      }
      return path
    }),
  )

  return {
    markdown: markdownPath,
    images,
  }
}
