import { describe, expect, test } from "bun:test"
import { translate } from "./i18n"

describe("translate", () => {
  test("returns chinese defaults", () => {
    expect(translate("ui.common.close")).toBe("关闭")
  })

  test("fills template variables", () => {
    expect(translate("ui.sessionTurn.status.thinkingWithTopic", { topic: "结构" })).toBe("思考：结构")
  })
})
