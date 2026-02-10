import type { PermissionRuleset } from "@opencode-ai/sdk/v2/client"

export const parseModel = (value?: string) => {
  const item = (value ?? "").trim()
  if (!item) return
  const parts = item.split("/").filter(Boolean)
  if (parts.length < 2) return
  return { providerID: parts[0], modelID: parts.slice(1).join("/") }
}

export const parseVariant = (value?: string) => {
  const item = (value ?? "").trim()
  if (item) return item
  return "max"
}

export const rules = (root: string): PermissionRuleset => [
  { permission: "*", pattern: "*", action: "allow" },
  { permission: "external_directory", pattern: `${root}/**`, action: "allow" },
  { permission: "external_directory", pattern: "*", action: "deny" },
]
