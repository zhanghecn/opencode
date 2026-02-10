import { dict as en } from "@opencode-ai/ui/i18n/en"
import { dict as zh } from "@opencode-ai/ui/i18n/zh"
import type { UiI18n, UiI18nKey, UiI18nParams } from "@opencode-ai/ui/context"

const fill = (text: string, params?: UiI18nParams) => {
  if (!params) return text
  return text.replace(/{{\s*([^}]+?)\s*}}/g, (_value, raw) => {
    const key = String(raw)
    const value = params[key]
    return value === undefined ? "" : String(value)
  })
}

export const translate = (key: UiI18nKey, params?: UiI18nParams) => {
  const text = zh[key] ?? en[key] ?? String(key)
  return fill(text, params)
}

export const i18n = (): UiI18n => ({
  locale: () => "zh",
  t: translate,
})
