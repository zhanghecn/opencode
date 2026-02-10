import { describe, expect, test } from "bun:test"
import { parseApi } from "./document-processor"

describe("parseApi", () => {
  test("defaults to proxy path", () => {
    expect(parseApi(" ")).toBe("/api/v1/parse")
  })

  test("keeps full endpoint", () => {
    expect(parseApi("http://example.com/api/v1/parse")).toBe("http://example.com/api/v1/parse")
  })

  test("adds default parse suffix", () => {
    expect(parseApi("http://example.com/")).toBe("http://example.com/api/v1/parse")
  })

  test("adds proxy suffix", () => {
    expect(parseApi("/api")).toBe("/api/v1/parse")
  })
})
