# 测试套件文档

本文档为 opencode 测试套件提供全面的文档说明，包括如何运行测试、测试基础设施以及每个测试模块的详细解释。

## 目录

- [概述](#概述)
- [运行测试](#运行测试)
- [测试基础设施](#测试基础设施)
- [测试模块](#测试模块)
- [测试模式](#测试模式)
- [编写新测试](#编写新测试)

---

## 概述

### 测试框架

opencode 项目使用 **Bun Test** (`bun:test`) 作为测试框架。Bun Test 提供了与 Jest 兼容的 API，具有出色的 TypeScript 支持和快速的执行速度。

### 测试统计

- **测试文件**: 55+ 个测试文件
- **测试代码**: ~15,000+ 行
- **位置**: `/packages/opencode/test/`

### 目录结构

```
test/
├── preload.ts              # 测试环境设置（在所有测试之前运行）
├── fixture/
│   └── fixture.ts          # 测试工具函数（tmpdir 等）
├── acp/                    # Agent Client Protocol 测试
├── agent/                  # Agent 配置测试
├── cli/                    # CLI 相关测试
├── config/                 # 配置加载测试
├── file/                   # 文件操作测试
├── ide/                    # IDE 集成测试
├── lsp/                    # Language Server Protocol 测试
├── mcp/                    # Model Context Protocol 测试
├── patch/                  # Patch 应用测试
├── permission/             # 权限系统测试
├── plugin/                 # 插件系统测试
├── project/                # 项目管理测试
├── provider/               # AI Provider 测试
├── question/               # 问题/提示测试
├── server/                 # 服务器功能测试
├── session/                # 会话管理测试
├── skill/                  # Skill 系统测试
├── snapshot/               # 快照功能测试
├── tool/                   # 工具实现测试
└── util/                   # 工具函数测试
```

---

## 运行测试

### 基本命令

```bash
# 运行所有测试
bun test

# 运行测试并显示详细输出
bun test --verbose

# 监视模式运行测试（文件变更时自动重新运行）
bun test --watch
```

### 过滤测试

```bash
# 运行匹配模式的测试
bun test --filter "agent"

# 运行特定测试文件
bun test test/agent/agent.test.ts

# 运行特定目录下的测试
bun test test/permission/
```

### 超时配置

```bash
# 设置自定义超时时间（毫秒）
bun test --timeout 10000

# 默认超时时间为 5000ms（5 秒）
```

### 覆盖率

```bash
# 运行测试并生成覆盖率报告
bun test --coverage
```

---

## 测试基础设施

### preload.ts - 环境设置

`preload.ts` 文件在所有测试之前运行，用于设置隔离的测试环境。

```typescript
// test/preload.ts

// 重要：必须在从 src/ 目录导入任何内容之前设置环境变量
// xdg-basedir 在导入时读取环境变量，所以必须先设置这些变量
import os from "os"
import path from "path"
import fs from "fs/promises"
import fsSync from "fs"
import { afterAll } from "bun:test"

// 使用进程 ID 创建唯一的隔离测试目录
const dir = path.join(os.tmpdir(), "opencode-test-data-" + process.pid)
await fs.mkdir(dir, { recursive: true })

// 所有测试完成后清理
afterAll(() => {
  fsSync.rmSync(dir, { recursive: true, force: true })
})

// 设置测试主目录以隔离测试与用户实际主目录
// 这可以防止测试读取到真实用户配置/技能（如 ~/.claude/skills）
const testHome = path.join(dir, "home")
await fs.mkdir(testHome, { recursive: true })
process.env["OPENCODE_TEST_HOME"] = testHome

// 设置 XDG 环境变量以隔离配置/缓存/数据目录
process.env["XDG_DATA_HOME"] = path.join(dir, "share")
process.env["XDG_CACHE_HOME"] = path.join(dir, "cache")
process.env["XDG_CONFIG_HOME"] = path.join(dir, "config")
process.env["XDG_STATE_HOME"] = path.join(dir, "state")

// 写入缓存版本文件以防止 global/index.ts 清除缓存
const cacheDir = path.join(dir, "cache", "opencode")
await fs.mkdir(cacheDir, { recursive: true })
await fs.writeFile(path.join(cacheDir, "version"), "14")

// 清除 Provider 环境变量以确保干净的测试状态
// 这可以防止测试意外使用真实的 API 密钥
delete process.env["ANTHROPIC_API_KEY"]
delete process.env["OPENAI_API_KEY"]
delete process.env["GOOGLE_API_KEY"]
delete process.env["GOOGLE_GENERATIVE_AI_API_KEY"]
delete process.env["AZURE_OPENAI_API_KEY"]
delete process.env["AWS_ACCESS_KEY_ID"]
delete process.env["AWS_PROFILE"]
delete process.env["AWS_REGION"]
delete process.env["AWS_BEARER_TOKEN_BEDROCK"]
delete process.env["OPENROUTER_API_KEY"]
delete process.env["GROQ_API_KEY"]
delete process.env["MISTRAL_API_KEY"]
delete process.env["PERPLEXITY_API_KEY"]
delete process.env["TOGETHER_API_KEY"]
delete process.env["XAI_API_KEY"]
delete process.env["DEEPSEEK_API_KEY"]
delete process.env["FIREWORKS_API_KEY"]
delete process.env["CEREBRAS_API_KEY"]
delete process.env["SAMBANOVA_API_KEY"]

// 现在可以安全地从 src/ 导入
const { Log } = await import("../src/util/log")

// 初始化日志，禁用打印以获得更干净的测试输出
Log.init({
  print: false,
  dev: true,
  level: "DEBUG",
})
```

**主要特性：**

- 为每次测试运行创建隔离的临时目录
- 设置 XDG 环境变量以防止干扰用户配置
- 清除所有 Provider API 密钥以确保干净的测试状态
- 初始化日志并禁用打印以获得更干净的输出
- 所有测试完成后自动清理

### fixture.ts - 测试工具

`fixture.ts` 文件提供用于创建测试环境的工具函数。

```typescript
// test/fixture/fixture.ts

import { $ } from "bun"
import * as fs from "fs/promises"
import os from "os"
import path from "path"
import type { Config } from "../../src/config/config"

// 从路径中去除空字节（针对 CI 环境问题的防御性修复）
function sanitizePath(p: string): string {
  return p.replace(/\0/g, "")
}

type TmpDirOptions<T> = {
  git?: boolean // 初始化 git 仓库
  config?: Partial<Config.Info> // 写入 opencode.json 配置
  init?: (dir: string) => Promise<T> // 自定义初始化函数
  dispose?: (dir: string) => Promise<T> // 自定义清理函数
}

/**
 * 创建用于测试的临时目录，可选择初始化 git 和配置
 *
 * @example
 * // 基本用法，使用异步释放
 * await using tmp = await tmpdir()
 * console.log(tmp.path) // /tmp/opencode-test-abc123
 *
 * @example
 * // 带 git 仓库
 * await using tmp = await tmpdir({ git: true })
 *
 * @example
 * // 带配置文件
 * await using tmp = await tmpdir({
 *   config: { model: "test/model" }
 * })
 *
 * @example
 * // 带自定义初始化
 * await using tmp = await tmpdir({
 *   git: true,
 *   init: async (dir) => {
 *     await Bun.write(`${dir}/test.txt`, "content")
 *     return { testFile: `${dir}/test.txt` }
 *   }
 * })
 * console.log(tmp.extra.testFile)
 */
export async function tmpdir<T>(options?: TmpDirOptions<T>) {
  // 创建唯一的临时目录
  const dirpath = sanitizePath(path.join(os.tmpdir(), "opencode-test-" + Math.random().toString(36).slice(2)))
  await fs.mkdir(dirpath, { recursive: true })

  // 如果请求，初始化 git 仓库
  if (options?.git) {
    await $`git init`.cwd(dirpath).quiet()
    await $`git commit --allow-empty -m "root commit ${dirpath}"`.cwd(dirpath).quiet()
  }

  // 如果提供，写入 opencode.json 配置
  if (options?.config) {
    await Bun.write(
      path.join(dirpath, "opencode.json"),
      JSON.stringify({
        $schema: "https://opencode.ai/config.json",
        ...options.config,
      }),
    )
  }

  // 运行自定义初始化
  const extra = await options?.init?.(dirpath)
  const realpath = sanitizePath(await fs.realpath(dirpath))

  return {
    // 异步释放模式 - 作用域退出时自动运行清理
    [Symbol.asyncDispose]: async () => {
      await options?.dispose?.(dirpath)
      // 注意：目录清理由 preload.ts 的 afterAll 处理
    },
    path: realpath,
    extra: extra as T,
  }
}
```

**主要特性：**

- 为测试隔离创建唯一的临时目录
- 可选的 git 仓库初始化
- 可选的配置文件创建
- 自定义初始化和释放钩子
- 使用异步释放模式（`await using`）自动清理

---

## 测试模块

### 1. Agent 测试 (`test/agent/`)

Agent 配置、权限和行为的测试。

| 测试文件        | 源文件               | 用途                 |
| --------------- | -------------------- | -------------------- |
| `agent.test.ts` | `src/agent/agent.ts` | Agent 配置和权限测试 |

**关键测试用例：**

```typescript
// 没有配置时返回默认的原生 Agent
test("returns default native agents when no config", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const agents = await Agent.list()
      const names = agents.map((a) => a.name)
      expect(names).toContain("build")
      expect(names).toContain("plan")
      expect(names).toContain("general")
      expect(names).toContain("explore")
    },
  })
})

// 从配置创建自定义 Agent
test("custom agent from config creates new agent", async () => {
  await using tmp = await tmpdir({
    config: {
      agent: {
        my_custom_agent: {
          model: "openai/gpt-4",
          description: "My custom agent",
          temperature: 0.5,
        },
      },
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const custom = await Agent.get("my_custom_agent")
      expect(custom?.model?.providerID).toBe("openai")
      expect(custom?.model?.modelID).toBe("gpt-4")
    },
  })
})
```

### 2. Permission 测试 (`test/permission/`)

控制工具访问的权限系统测试。

| 测试文件        | 源文件                    | 用途               |
| --------------- | ------------------------- | ------------------ |
| `next.test.ts`  | `src/permission/next.ts`  | 权限评估和规则匹配 |
| `arity.test.ts` | `src/permission/arity.ts` | 权限元数测试       |

**关键测试用例：**

```typescript
// fromConfig - 字符串值变成通配符规则
test("fromConfig - string value becomes wildcard rule", () => {
  const result = PermissionNext.fromConfig({ bash: "allow" })
  expect(result).toEqual([{ permission: "bash", pattern: "*", action: "allow" }])
})

// evaluate - 最后匹配的规则获胜
test("evaluate - last matching rule wins", () => {
  const result = PermissionNext.evaluate("bash", "rm", [
    { permission: "bash", pattern: "*", action: "allow" },
    { permission: "bash", pattern: "rm", action: "deny" },
  ])
  expect(result.action).toBe("deny")
})

// ask - 当操作为 allow 时立即解析
test("ask - resolves immediately when action is allow", async () => {
  await using tmp = await tmpdir({ git: true })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const result = await PermissionNext.ask({
        sessionID: "session_test",
        permission: "bash",
        patterns: ["ls"],
        metadata: {},
        always: [],
        ruleset: [{ permission: "bash", pattern: "*", action: "allow" }],
      })
      expect(result).toBeUndefined()
    },
  })
})
```

### 3. Tool 测试 (`test/tool/`)

各种工具实现的测试。

| 测试文件                     | 源文件                    | 用途          |
| ---------------------------- | ------------------------- | ------------- |
| `bash.test.ts`               | `src/tool/bash.ts`        | Bash 命令执行 |
| `read.test.ts`               | `src/tool/read.ts`        | 文件读取      |
| `grep.test.ts`               | `src/tool/grep.ts`        | 内容搜索      |
| `apply_patch.test.ts`        | `src/tool/apply_patch.ts` | Patch 应用    |
| `truncation.test.ts`         | `src/tool/truncation.ts`  | 输出截断      |
| `registry.test.ts`           | `src/tool/registry.ts`    | 工具注册表    |
| `question.test.ts`           | `src/tool/question.ts`    | 问题工具      |
| `external-directory.test.ts` | `src/tool/`               | 外部目录访问  |

**关键测试用例：**

```typescript
// 基本 bash 执行
test("basic", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const bash = await BashTool.init()
      const result = await bash.execute(
        {
          command: "echo 'test'",
          description: "Echo test message",
        },
        ctx,
      )
      expect(result.metadata.exit).toBe(0)
      expect(result.metadata.output).toContain("test")
    },
  })
})

// 超过行数限制时截断输出
test("truncates output exceeding line limit", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const bash = await BashTool.init()
      const lineCount = Truncate.MAX_LINES + 500
      const result = await bash.execute(
        {
          command: `seq 1 ${lineCount}`,
          description: "Generate lines exceeding limit",
        },
        ctx,
      )
      expect((result.metadata as any).truncated).toBe(true)
      expect(result.output).toContain("truncated")
    },
  })
})
```

### 4. Config 测试 (`test/config/`)

配置加载和解析的测试。

| 测试文件              | 源文件                   | 用途              |
| --------------------- | ------------------------ | ----------------- |
| `config.test.ts`      | `src/config/config.ts`   | 配置加载和合并    |
| `markdown.test.ts`    | `src/config/markdown.ts` | Markdown 配置解析 |
| `agent-color.test.ts` | `src/config/`            | Agent 颜色配置    |

**关键测试用例：**

```typescript
// 加载 JSON 配置文件
test("loads JSON config file", async () => {
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          model: "test/model",
          username: "testuser",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await Config.get()
      expect(config.model).toBe("test/model")
      expect(config.username).toBe("testuser")
    },
  })
})

// 处理环境变量替换
test("handles environment variable substitution", async () => {
  process.env["TEST_VAR"] = "test_theme"
  await using tmp = await tmpdir({
    init: async (dir) => {
      await Bun.write(
        path.join(dir, "opencode.json"),
        JSON.stringify({
          $schema: "https://opencode.ai/config.json",
          theme: "{env:TEST_VAR}",
        }),
      )
    },
  })
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const config = await Config.get()
      expect(config.theme).toBe("test_theme")
    },
  })
})
```

### 5. Session 测试 (`test/session/`)

会话管理和生命周期的测试。

| 测试文件                 | 源文件                       | 用途           |
| ------------------------ | ---------------------------- | -------------- |
| `session.test.ts`        | `src/session/`               | 会话创建和事件 |
| `compaction.test.ts`     | `src/session/compaction.ts`  | 消息压缩       |
| `retry.test.ts`          | `src/session/retry.ts`       | 重试逻辑       |
| `llm.test.ts`            | `src/session/llm.ts`         | LLM 集成       |
| `revert-compact.test.ts` | `src/session/`               | 回滚和压缩     |
| `message-v2.test.ts`     | `src/session/message.ts`     | 消息格式 v2    |
| `instruction.test.ts`    | `src/session/instruction.ts` | 指令处理       |

**关键测试用例：**

```typescript
// 创建会话时应该发出 session.started 事件
test("should emit session.started event when session is created", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      let eventReceived = false
      let receivedInfo: Session.Info | undefined

      const unsub = Bus.subscribe(Session.Event.Created, (event) => {
        eventReceived = true
        receivedInfo = event.properties.info as Session.Info
      })

      const session = await Session.create({})
      await new Promise((resolve) => setTimeout(resolve, 100))
      unsub()

      expect(eventReceived).toBe(true)
      expect(receivedInfo?.id).toBe(session.id)
      await Session.remove(session.id)
    },
  })
})
```

### 6. Snapshot 测试 (`test/snapshot/`)

文件快照和回滚功能的测试。

| 测试文件           | 源文件          | 用途           |
| ------------------ | --------------- | -------------- |
| `snapshot.test.ts` | `src/snapshot/` | 快照跟踪和回滚 |

**关键测试用例：**

```typescript
// 快照测试的引导函数
async function bootstrap() {
  return tmpdir({
    git: true,
    init: async (dir) => {
      const unique = Math.random().toString(36).slice(2)
      const aContent = `A${unique}`
      const bContent = `B${unique}`
      await Bun.write(`${dir}/a.txt`, aContent)
      await Bun.write(`${dir}/b.txt`, bContent)
      await $`git add .`.cwd(dir).quiet()
      await $`git commit --no-gpg-sign -m init`.cwd(dir).quiet()
      return { aContent, bContent }
    },
  })
}

// 正确跟踪已删除的文件
test("tracks deleted files correctly", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      await $`rm ${tmp.path}/a.txt`.quiet()
      expect((await Snapshot.patch(before!)).files).toContain(`${tmp.path}/a.txt`)
    },
  })
})

// 回滚应该删除新文件
test("revert should remove new files", async () => {
  await using tmp = await bootstrap()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const before = await Snapshot.track()
      await Bun.write(`${tmp.path}/new.txt`, "NEW")
      await Snapshot.revert([await Snapshot.patch(before!)])
      expect(await Bun.file(`${tmp.path}/new.txt`).exists()).toBe(false)
    },
  })
})
```

### 7. 其他测试模块

| 目录             | 用途                                |
| ---------------- | ----------------------------------- |
| `test/acp/`      | Agent Client Protocol 测试          |
| `test/cli/`      | CLI 和 TUI 测试                     |
| `test/file/`     | 文件操作（忽略模式、路径遍历）      |
| `test/ide/`      | IDE 集成测试                        |
| `test/lsp/`      | Language Server Protocol 客户端测试 |
| `test/mcp/`      | Model Context Protocol 测试         |
| `test/patch/`    | Patch 应用测试                      |
| `test/plugin/`   | 插件系统测试                        |
| `test/project/`  | 项目管理测试                        |
| `test/provider/` | AI Provider 集成测试                |
| `test/question/` | 问题/提示测试                       |
| `test/server/`   | 服务器功能测试                      |
| `test/skill/`    | Skill 系统测试                      |
| `test/util/`     | 工具函数测试                        |

---

## 测试模式

### 1. 异步释放模式

使用 `await using` 自动清理临时资源：

```typescript
test("example with async disposal", async () => {
  // tmp 在测试退出时自动清理
  await using tmp = await tmpdir({ git: true })

  // 使用 tmp.path 进行测试操作
  await Bun.write(`${tmp.path}/test.txt`, "content")

  // 无需手动清理 - 释放自动发生
})
```

### 2. Instance.provide 模式

使用 `Instance.provide` 为测试设置项目上下文：

```typescript
test("example with Instance.provide", async () => {
  await using tmp = await tmpdir()

  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      // 这里的所有代码都在 tmp.path 项目的上下文中运行
      const config = await Config.get()
      expect(config).toBeDefined()
    },
  })
})
```

### 3. 权限测试辅助函数

用于评估权限的辅助函数：

```typescript
function evalPerm(agent: Agent.Info | undefined, permission: string): PermissionNext.Action | undefined {
  if (!agent) return undefined
  return PermissionNext.evaluate(permission, "*", agent.permission).action
}

// 使用示例
test("agent permission test", async () => {
  await using tmp = await tmpdir()
  await Instance.provide({
    directory: tmp.path,
    fn: async () => {
      const build = await Agent.get("build")
      expect(evalPerm(build, "bash")).toBe("allow")
      expect(evalPerm(build, "edit")).toBe("allow")
    },
  })
})
```

### 4. Mock Context 模式

为工具测试创建模拟上下文对象：

```typescript
const ctx = {
  sessionID: "test",
  messageID: "",
  callID: "",
  agent: "build",
  abort: AbortSignal.any([]),
  messages: [],
  metadata: () => {},
  ask: async () => {},
}

test("tool with mock context", async () => {
  await Instance.provide({
    directory: projectRoot,
    fn: async () => {
      const bash = await BashTool.init()
      const result = await bash.execute({ command: "echo test", description: "Test" }, ctx)
      expect(result.metadata.exit).toBe(0)
    },
  })
})
```

### 5. Bootstrap 函数模式

为复杂测试场景创建可复用的设置函数：

```typescript
async function bootstrap() {
  return tmpdir({
    git: true,
    init: async (dir) => {
      // 设置初始状态
      await Bun.write(`${dir}/file.txt`, "content")
      await $`git add .`.cwd(dir).quiet()
      await $`git commit -m "init"`.cwd(dir).quiet()
      return { initialContent: "content" }
    },
  })
}

test("test using bootstrap", async () => {
  await using tmp = await bootstrap()
  // tmp.extra.initialContent 可用
  expect(tmp.extra.initialContent).toBe("content")
})
```

### 6. 模块 Mock 模式

为隔离测试模拟外部依赖：

```typescript
import { mock } from "bun:test"

test("test with mocked fetch", async () => {
  const originalFetch = globalThis.fetch
  const mockFetch = mock((url: string) => {
    if (url.includes("example.com")) {
      return Promise.resolve(new Response(JSON.stringify({ data: "mocked" })))
    }
    return originalFetch(url)
  })
  globalThis.fetch = mockFetch as unknown as typeof fetch

  try {
    // 使用 fetch 的测试代码
  } finally {
    globalThis.fetch = originalFetch
  }
})
```

---

## 编写新测试

### 测试文件模板

```typescript
import { test, expect, describe } from "bun:test"
import { tmpdir } from "../fixture/fixture"
import { Instance } from "../../src/project/instance"

// 导入被测试的模块
import { MyModule } from "../../src/my-module"

describe("MyModule", () => {
  test("should do something", async () => {
    await using tmp = await tmpdir({ git: true })

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // 准备
        const input = "test input"

        // 执行
        const result = await MyModule.doSomething(input)

        // 断言
        expect(result).toBeDefined()
        expect(result.value).toBe("expected value")
      },
    })
  })

  test("should handle edge case", async () => {
    await using tmp = await tmpdir()

    await Instance.provide({
      directory: tmp.path,
      fn: async () => {
        // 测试边界情况
        await expect(MyModule.doSomething(null)).rejects.toThrow()
      },
    })
  })
})
```

### 最佳实践

1. **使用描述性测试名称** - 测试名称应清楚描述正在测试的内容
2. **每个测试一个断言** - 保持测试专注于单一行为
3. **使用异步释放** - 始终对临时资源使用 `await using`
4. **隔离测试** - 每个测试应该独立，不依赖其他测试
5. **清理资源** - 使用释放模式确保清理
6. **模拟外部依赖** - 不要在测试中进行真实的 API 调用
7. **测试边界情况** - 包含错误条件和边界情况的测试
8. **使用 describe 块** - 将相关测试分组在一起
9. **保持测试快速** - 避免不必要的延迟或复杂设置
10. **记录复杂测试** - 添加注释解释不明显的测试逻辑

---

## 总结

opencode 测试套件使用 Bun Test 提供了代码库的全面覆盖。主要特性包括：

- **隔离的测试环境** - 通过 `preload.ts` 实现
- **可复用的测试工具** - 通过 `fixture.ts` 实现
- **异步释放模式** - 自动清理
- **Instance.provide 模式** - 项目上下文
- **全面的模块覆盖** - 涵盖所有主要功能

如有关于测试套件的问题或疑问，请参考源代码或在 GitHub 上提交 issue。
