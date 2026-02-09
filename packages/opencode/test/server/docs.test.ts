import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"

Log.init({ print: false })

describe("docs ui", () => {
  test("serves local docs page", async () => {
    const app = Server.App()
    const response = await app.request("/docs")
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    const html = await response.text()
    expect(html).toContain("opencode-docs-ui")
    expect(html).toContain("SwaggerUIBundle")
    expect(html).toContain("/doc")
  })
})
