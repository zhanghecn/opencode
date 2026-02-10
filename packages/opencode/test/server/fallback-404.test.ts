import { describe, expect, test } from "bun:test"
import { Server } from "../../src/server/server"
import { Log } from "../../src/util/log"

Log.init({ print: false })

describe("server fallback", () => {
  test("returns 404 html for unknown routes", async () => {
    const app = Server.App()
    const response = await app.request("/__missing")
    expect(response.status).toBe(404)
    expect(response.headers.get("content-type")).toContain("text/html")
    const html = await response.text()
    expect(html).toContain("404")
    expect(html).toContain("Not Found")
    expect(html).toContain('data-appearance="terminal"')
  })
})
