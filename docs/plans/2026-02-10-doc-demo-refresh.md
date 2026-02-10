# Doc Demo Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Align `doc-demo` with the opencode web layout, default to Chinese, and remove the parse API env blocker while keeping document parsing and permissions aligned with `plan/文档解析api.json`.

**Architecture:** Add small helper modules for i18n and session config, then wire them into the app, parsing flow, and UI layout. Keep the frontend separate from the server by relying on fixed env/config values and SDK calls only.

**Tech Stack:** SolidJS + Vite, `@opencode-ai/ui`, `@opencode-ai/sdk`, Bun tests.

### Task 1: Add i18n + session config helpers

**Files:**
- Create: `packages/doc-demo/src/i18n.ts`
- Create: `packages/doc-demo/src/context/session-config.ts`
- Test: `packages/doc-demo/src/i18n.test.ts`
- Test: `packages/doc-demo/src/context/session-config.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, test } from "bun:test"
import { translate } from "./i18n"

describe("translate", () => {
  test("returns chinese defaults", () => {
    expect(translate("ui.common.close")).toBe("关闭")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/doc-demo && bun test src/i18n.test.ts src/context/session-config.test.ts`
Expected: FAIL with missing module or missing export errors.

**Step 3: Implement minimal helpers**

```ts
export const translate = (key: UiI18nKey, params?: UiI18nParams) => {
  const text = zh[key] ?? en[key] ?? String(key)
  return fill(text, params)
}
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/doc-demo && bun test src/i18n.test.ts src/context/session-config.test.ts`
Expected: PASS.

**Step 5: Commit**

Skip (commits not requested).

### Task 2: Wire parse API defaults + permissions

**Files:**
- Modify: `packages/doc-demo/src/context/document-processor.tsx`
- Modify: `packages/doc-demo/vite.config.ts`
- Modify: `packages/doc-demo/src/env.d.ts`
- Modify: `packages/doc-demo/.env.example`
- Test: `packages/doc-demo/src/context/document-processor.test.ts`

**Step 1: Write/confirm failing test**

```ts
expect(parseApi(" ")).toBe("http://192.168.0.211:1800/api/v1/parse")
```

**Step 2: Run test to verify it fails (if changing behavior)**

Run: `cd packages/doc-demo && bun test src/context/document-processor.test.ts`
Expected: FAIL if default changes without config.

**Step 3: Implement minimal defaults**

```ts
const defaultApi = typeof __DOC_PARSE_URL__ === "string" && __DOC_PARSE_URL__
  ? __DOC_PARSE_URL__
  : "http://192.168.0.211:1800/api/v1/parse"
```

**Step 4: Run test to verify it passes**

Run: `cd packages/doc-demo && bun test src/context/document-processor.test.ts`
Expected: PASS.

**Step 5: Commit**

Skip (commits not requested).

### Task 3: Refresh layout + Chinese copy

**Files:**
- Modify: `packages/doc-demo/src/app.tsx`
- Modify: `packages/doc-demo/src/pages/session.tsx`
- Modify: `packages/doc-demo/src/components/simplified-layout.tsx`
- Modify: `packages/doc-demo/src/components/doc-upload.tsx`
- Modify: `packages/doc-demo/src/context/global.tsx`

**Step 1: Write the failing test (if adding helper)**

Use the i18n/session-config tests from Task 1 as coverage for new helpers.

**Step 2: Implement layout + copy changes**

```tsx
<div class="grid ... bg-background-secondary">
  <section class="... bg-background-base">...</section>
  <section class="... bg-background-base">...</section>
  <aside class="... bg-background-base">...</aside>
</div>
```

**Step 3: Run tests**

Run: `cd packages/doc-demo && bun test`
Expected: PASS.

**Step 4: Commit**

Skip (commits not requested).

### Task 4: Verification

**Step 1: Run doc-demo tests**

Run: `cd packages/doc-demo && bun test`
Expected: PASS.

**Step 2: Manual smoke check**

Run: `bun run --cwd packages/doc-demo dev` and verify:
- Default language is Chinese
- Upload accepts PDF/PPT/Excel/Word/Images
- Three-panel layout matches opencode web proportions
- No `VITE_DOC_PARSE_API_URL is required` error

**Step 3: Commit**

Skip (commits not requested).
