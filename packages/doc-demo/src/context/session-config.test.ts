import { describe, expect, test } from "bun:test"
import { parseModel, parseVariant, rules } from "./session-config"

describe("parseModel", () => {
  test("returns undefined for empty input", () => {
    expect(parseModel("")).toBeUndefined()
  })

  test("splits provider and model", () => {
    expect(parseModel("anthropic/claude-sonnet-4-20250514")).toEqual({
      providerID: "anthropic",
      modelID: "claude-sonnet-4-20250514",
    })
  })

  test("keeps nested model segments", () => {
    expect(parseModel("openai/gpt-4o/mini")).toEqual({
      providerID: "openai",
      modelID: "gpt-4o/mini",
    })
  })
})

describe("parseVariant", () => {
  test("defaults to max when blank", () => {
    expect(parseVariant("")).toBe("max")
  })

  test("trims custom variant", () => {
    expect(parseVariant("  high ")).toBe("high")
  })
})

describe("rules", () => {
  test("builds fixed permission rules", () => {
    expect(rules("/work/documents")).toEqual([
      { permission: "*", pattern: "*", action: "allow" },
      { permission: "external_directory", pattern: "/work/documents/**", action: "allow" },
      { permission: "external_directory", pattern: "*", action: "deny" },
    ])
  })
})
