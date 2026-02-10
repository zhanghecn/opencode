import { describe, expect, test } from "bun:test"
import { chunk } from "./document-storage"

describe("chunk", () => {
  test("splits long strings", () => {
    const value = "a".repeat(45000)
    const parts = chunk(value, 16000)
    expect(parts.join("")).toBe(value)
    const max = Math.max(...parts.map((part) => part.length))
    expect(max).toBeLessThanOrEqual(16000)
  })

  test("keeps empty strings", () => {
    expect(chunk("", 16)).toEqual([""])
  })
})
