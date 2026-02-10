# Doc Demo Storage Chunking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent `E2BIG` shell errors by chunking markdown and base64 writes in doc-demo storage.

**Architecture:** Introduce a chunking helper and small command builders that split long strings into 16k segments. `store` will write markdown and base64 data via multiple short shell commands, then decode images from a temporary base64 file. No server or API changes.

**Tech Stack:** Bun, TypeScript, @opencode-ai SDK, Bun test.

### Task 1: Add chunking tests

**Files:**
- Modify: `packages/doc-demo/src/context/document-storage.test.ts`

**Step 1: Write the failing test**

```ts
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
})
```

**Step 2: Run test to verify it fails**

Run: `cd packages/doc-demo && bun test src/context/document-storage.test.ts`  
Expected: FAIL with `Export named 'chunk' not found`.

### Task 2: Implement chunk helper and chunked writes

**Files:**
- Modify: `packages/doc-demo/src/context/document-storage.ts`

**Step 1: Write minimal implementation**

```ts
const limit = 16000

export const chunk = (value: string, size = limit) => {
  if (!value) return [""]
  const parts = []
  for (let i = 0; i < value.length; i += size) {
    parts.push(value.slice(i, i + size))
  }
  return parts
}
```

Add helpers to build chunked write commands (truncate file, append chunks, base64 temp file decode), and update `store` to run each command sequentially instead of a single heredoc/printf.

**Step 2: Run test to verify it passes**

Run: `cd packages/doc-demo && bun test src/context/document-storage.test.ts`  
Expected: PASS.

**Step 3: Commit**

```bash
git add packages/doc-demo/src/context/document-storage.ts \
  packages/doc-demo/src/context/document-storage.test.ts
git commit -m "fix: chunk doc-demo storage writes"
```
