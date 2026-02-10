# Doc Demo Proxy + E2E Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch doc-demo to a Vite `/api` proxy driven by `.env`, remove hardcoded parse URLs, and add an end-to-end test that parses a document, writes markdown into the documents directory, loads skills, and generates a report.

**Architecture:** Use a Vite proxy for `/api` (target from `.env`), keep frontend requests relative, and add a shared document storage helper used by both runtime and integration tests. The integration test drives the real parse API and opencode server via SDK calls.

**Tech Stack:** SolidJS + Vite, Bun tests, `@opencode-ai/sdk`.

### Task 1: Update parse API tests + E2E test skeleton

**Files:**
- Modify: `packages/doc-demo/src/context/document-processor.test.ts`
- Create: `packages/doc-demo/src/integration/document-flow.test.ts`

**Step 1: Write the failing tests**

```ts
expect(parseApi("")).toBe("/api/v1/parse")
```

**Step 2: Run tests to verify they fail**

Run: `cd packages/doc-demo && bun test src/context/document-processor.test.ts src/integration/document-flow.test.ts`
Expected: FAIL (parseApi assertions + missing helpers).

**Step 3: Commit**

Skip (commits not requested).

### Task 2: Add document storage helper + update document processor

**Files:**
- Create: `packages/doc-demo/src/context/document-storage.ts`
- Modify: `packages/doc-demo/src/context/document-processor.tsx`

**Step 1: Implement minimal helper**

```ts
export const store = async (input: {...}) => { ... }
```

**Step 2: Update processor to call `/api/v1/parse`**

```ts
const url = parseApi("/api")
```

**Step 3: Run tests**

Run: `cd packages/doc-demo && bun test src/context/document-processor.test.ts src/integration/document-flow.test.ts`
Expected: PASS for parseApi tests, E2E still failing until env/proxy updates.

### Task 3: Wire `.env` + Vite proxy

**Files:**
- Modify: `packages/doc-demo/vite.config.ts`
- Modify: `packages/doc-demo/.env.example`
- Create: `packages/doc-demo/.env`
- Modify: `packages/doc-demo/src/env.d.ts`

**Step 1: Add proxy to Vite config**

```ts
server: {
  proxy: { "/api": { target, changeOrigin: true } },
}
```

**Step 2: Run tests**

Run: `cd packages/doc-demo && bun test`
Expected: PASS.

### Task 4: E2E test completion

**Files:**
- Modify: `packages/doc-demo/src/integration/document-flow.test.ts`

**Step 1: Implement test flow**

1. Read PDF from `packages/doc-demo/test_work/AI统一网关.pdf`
2. POST to parse API (base from env)
3. Store markdown via SDK shell into documents dir
4. Configure skills via `sdk.config.update`
5. Prompt agent to generate report and assert file exists

**Step 2: Run tests**

Run: `cd packages/doc-demo && bun test src/integration/document-flow.test.ts`
Expected: PASS with running opencode server + parse API.
