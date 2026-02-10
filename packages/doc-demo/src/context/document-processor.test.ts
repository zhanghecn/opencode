import { describe, expect, test } from "bun:test"
import { parseApi } from "./document-processor"

describe("parseApi", () => {
  test("falls back to plan default", () => {
    expect(parseApi(" ")).toBe("http://192.168.0.211:1800/api/v1/parse")
  })

  test("keeps full endpoint", () => {
    expect(parseApi("http://example.com/api/v1/parse")).toBe("http://example.com/api/v1/parse")
  })

  test("adds default parse suffix", () => {
    expect(parseApi("http://example.com/")).toBe("http://example.com/api/v1/parse")
  })
})
