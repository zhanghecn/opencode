# 调试运行指南

本文档介绍如何调试和运行 OpenCode。

## CLI 开发模式

### 基本启动

```bash
# 从项目根目录启动
bun dev

# 等同于
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

### 带参数启动

```bash
# 指定模型
bun dev -- --model anthropic/claude-sonnet-4-20250514

# 指定项目目录
bun dev -- --project /path/to/project

# 执行单次命令
bun dev -- -p "你好"

# 启动 Server 模式
bun dev -- serve
```

## VS Code 调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": [],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug Server",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": ["serve"],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug with Prompt",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": ["-p", "测试提示词"],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug SDK Example",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/sdk/js/example/example.ts",
      "cwd": "${workspaceFolder}",
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    }
  ]
}
```

---

## SDK 编排调试

本节用于：运行 opencode server → SDK 连接 → 自定义 agent 编排 → Web 页面操作。

### 架构概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         入口层 (CLI)                                 │
│   packages/opencode/src/index.ts                                    │
│   ├── opencode serve   → 启动无头 HTTP 服务器                        │
│   ├── opencode web     → 启动服务器 + 打开浏览器                      │
│   └── opencode run     → 交互式 TUI 模式                             │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Server 层 (Hono.js)                            │
│   packages/opencode/src/server/server.ts                            │
│   默认监听: http://127.0.0.1:4096                                   │
│                                                                     │
│   特性:                                                             │
│   - RESTful API + OpenAPI 文档                                      │
│   - SSE 实时事件流                                                   │
│   - WebSocket 支持                                                  │
│   - 基本认证 (OPENCODE_SERVER_PASSWORD)                              │
│   - CORS 白名单                                                     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API 路由层                                   │
│   packages/opencode/src/server/routes/                              │
│                                                                     │
│   /session    → SessionRoutes   → SDK 调用的核心接口                 │
│   /global     → GlobalRoutes    → SSE 全局事件流                     │
│   /project    → ProjectRoutes   → 项目信息                           │
│   /file       → FileRoutes      → 文件操作                           │
│   /pty        → PtyRoutes       → 伪终端                             │
│   /mcp        → McpRoutes       → MCP 协议                           │
│   /provider   → ProviderRoutes  → AI 提供商                          │
│   /config     → ConfigRoutes    → 配置管理                           │
│   /permission → PermissionRoutes→ 权限设置                           │
│   /question   → QuestionRoutes  → 权限询问                           │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        业务逻辑层                                    │
│                                                                     │
│   packages/opencode/src/session/   ← 会话管理                       │
│   ├── index.ts      → Session 创建/列表/获取                         │
│   ├── prompt.ts     → 消息循环处理                                   │
│   ├── message.ts    → 消息存储 (旧版)                                │
│   └── message-v2.ts → 消息存储 (新版)                                │
│                                                                     │
│   packages/opencode/src/agent/     ← Agent 执行                     │
│   └── agent.ts      → Agent 定义与执行入口                           │
│                                                                     │
│   packages/opencode/src/tool/      ← 工具执行                       │
│   └── builtin/      → 内置工具 (read, write, bash, etc.)            │
│                                                                     │
│   packages/opencode/src/provider/  ← LLM 调用                       │
│   ├── provider.ts   → 提供商管理                                    │
│   └── model.ts      → 模型调用                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 入口与调用链（源码阅读顺序）

| 序号 | 文件路径                                         | 作用                       |
| ---- | ------------------------------------------------ | -------------------------- |
| 1    | `packages/opencode/src/index.ts`                 | CLI 总入口，Yargs 命令定义 |
| 2    | `packages/opencode/src/cli/cmd/serve.ts`         | `opencode serve` 命令实现  |
| 3    | `packages/opencode/src/cli/cmd/web.ts`           | `opencode web` 命令实现    |
| 4    | `packages/opencode/src/server/server.ts`         | HTTP 服务器与路由聚合      |
| 5    | `packages/opencode/src/server/routes/session.ts` | **SDK 主要调用的会话 API** |
| 6    | `packages/opencode/src/server/routes/global.ts`  | SSE 事件流                 |
| 7    | `packages/opencode/src/session/prompt.ts`        | 会话消息循环               |
| 8    | `packages/opencode/src/agent/agent.ts`           | Agent 执行入口             |
| 9    | `packages/opencode/src/provider/provider.ts`     | 模型调用入口               |
| 10   | `packages/opencode/src/tool/`                    | 工具执行入口               |
| 11   | `packages/sdk/js/src/index.ts`                   | **SDK 入口**               |
| 12   | `packages/sdk/js/src/client.ts`                  | SDK 客户端封装             |
| 13   | `packages/sdk/js/src/server.ts`                  | SDK 服务器启动器           |
| 14   | `packages/sdk/js/example/example.ts`             | SDK 使用示例               |
| 15   | `packages/app/src/app.tsx`                       | Web UI 入口                |

### 快速启动服务

#### 方式一：开发模式启动

```bash
# 启动 Server（无头模式）
bun dev -- serve

# 输出示例:
# opencode server listening on http://127.0.0.1:4096

# 启动 Server + 打开浏览器
bun dev -- web

# 带调试日志启动
OPENCODE_LOG_LEVEL=debug bun dev -- serve
```

#### 方式二：后台运行

```bash
# 后台启动 Server
nohup bun dev -- serve > /tmp/opencode-server.log 2>&1 &

# 检查是否运行
curl -s http://127.0.0.1:4096/ | head -5

# 查看日志
tail -f /tmp/opencode-server.log
```

#### 方式三：使用 SDK 自动启动

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

// SDK 会自动 spawn opencode serve 进程
const server = await createOpencodeServer({
  hostname: "127.0.0.1",
  port: 4096,
  timeout: 5000, // 等待服务器启动的超时时间
})

console.log(`Server running at: ${server.url}`)

// 完成后关闭
server.close()
```

### SDK 连接与使用

#### SDK 导出结构

```typescript
// packages/sdk/js/src/index.ts
export * from "./client.js" // createOpencodeClient
export * from "./server.js" // createOpencodeServer, createOpencodeTui

// 便捷函数：同时创建 server 和 client
export async function createOpencode(options?: ServerOptions) {
  const server = await createOpencodeServer(options)
  const client = createOpencodeClient({ baseUrl: server.url })
  return { client, server }
}
```

#### 客户端创建

```typescript
// packages/sdk/js/src/client.ts
import { createOpencodeClient } from "@opencode-ai/sdk"

// 连接到已运行的 server
const client = createOpencodeClient({
  baseUrl: "http://127.0.0.1:4096",
  directory: "/path/to/project", // 可选：指定工作目录
})

// client 提供的 API:
// - client.session.create()     创建会话
// - client.session.list()       列出会话
// - client.session.get()        获取会话详情
// - client.session.prompt()     发送消息
// - client.session.messages()   获取消息列表
// - client.session.abort()      中止执行
// - client.project.*            项目相关
// - client.file.*               文件操作
// - client.provider.*           提供商配置
```

#### 服务器启动器

```typescript
// packages/sdk/js/src/server.ts
import { createOpencodeServer, createOpencodeTui } from "@opencode-ai/sdk"

// 启动无头服务器
const server = await createOpencodeServer({
  hostname: "127.0.0.1", // 默认值
  port: 4096, // 默认值
  timeout: 5000, // 启动超时
  config: {
    logLevel: "debug", // 日志级别
  },
})

// 启动交互式 TUI
const tui = createOpencodeTui({
  project: "/path/to/project",
  model: "anthropic/claude-sonnet-4-20250514",
  session: "session-id", // 可选：恢复会话
  agent: "agent-name", // 可选：指定 agent
})
```

#### 完整使用示例

```typescript
// packages/sdk/js/example/example.ts
import { createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk"
import { pathToFileURL } from "bun"

// 1. 启动服务器
const server = await createOpencodeServer()
const client = createOpencodeClient({ baseUrl: server.url })

// 2. 创建会话
const session = await client.session.create()
console.log("Session created:", session.data.id)

// 3. 发送带文件的消息
await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      {
        type: "file",
        mime: "text/plain",
        url: pathToFileURL("./src/index.ts").href,
      },
      {
        type: "text",
        text: "Write tests for every public function in this file.",
      },
    ],
  },
})

// 4. 并行处理多个文件
const files = ["file1.ts", "file2.ts", "file3.ts"]
await Promise.all(
  files.map(async (file) => {
    const session = await client.session.create()
    await client.session.prompt({
      path: { id: session.data.id },
      body: {
        parts: [
          { type: "file", mime: "text/plain", url: pathToFileURL(file).href },
          { type: "text", text: "Analyze this file and suggest improvements." },
        ],
      },
    })
  }),
)

// 5. 完成后关闭服务器
server.close()
```

### 数据流跟踪

用户发送消息的完整调用链：

```
1. Web UI / SDK Client
   └─> POST /session/{id}/prompt

2. SessionRoutes (session.ts)
   └─> 验证参数 → 调用 Session.prompt()

3. Session.prompt (prompt.ts)
   └─> 创建消息 → 启动 Agent 循环

4. Agent.execute (agent.ts)
   └─> 构建系统提示词 → 调用 Provider

5. Provider.call (provider.ts)
   └─> 选择模型 → 调用 LLM API

6. Tool.execute (tool/*.ts)
   └─> 执行工具 → 返回结果

7. Bus.publish (bus.ts)
   └─> 发布事件 → SSE 推送到客户端

8. Web UI 更新
   └─> 接收 SSE → 更新界面
```

### 关键断点位置

| 调试场景     | 文件                       | 断点位置                 |
| ------------ | -------------------------- | ------------------------ |
| SDK 请求进入 | `server/routes/session.ts` | POST handler 入口        |
| 会话创建     | `session/index.ts`         | `Session.create()`       |
| 消息处理     | `session/prompt.ts`        | `SessionPrompt.prompt()` |
| Agent 执行   | `agent/agent.ts`           | `Agent.execute()`        |
| 工具调用     | `tool/builtin/*.ts`        | `execute()` 方法         |
| LLM 调用     | `provider/provider.ts`     | 模型调用入口             |
| 事件发布     | `bus/index.ts`             | `Bus.publish()`          |

### VS Code 调试配置（SDK + Server）

使用本文件上方的 `Debug Server` 与 `Debug SDK Example` 配置即可覆盖：

- server 启动与 API 路由
- SDK 请求 → session → agent → provider → tool 的完整链路

### 相关 VS Code 插件

- Bun 调试器扩展（提供 `type: "bun"` 调试能力）
- OpenCode 扩展（可选，用于 IDE 集成体验）

---

## 日志系统

### 日志级别

OpenCode 使用结构化日志系统，支持以下级别：

| 级别    | 说明         |
| ------- | ------------ |
| `debug` | 详细调试信息 |
| `info`  | 一般信息     |
| `warn`  | 警告信息     |
| `error` | 错误信息     |

### 设置日志级别

```bash
# 环境变量方式
OPENCODE_LOG_LEVEL=debug bun dev

# 命令行参数
bun dev -- --log-level debug
```

### 日志文件位置

日志文件存储在用户状态目录：

- **Linux**: `~/.local/state/opencode/logs/`
- **macOS**: `~/Library/Application Support/opencode/logs/`
- **Windows**: `%APPDATA%\opencode\logs\`

---

## 断点调试

### 使用 VS Code

1. 在代码中设置断点
2. 选择调试配置
3. 按 F5 启动调试
4. 使用调试控制台查看变量

### 使用 Bun 内置调试器

```bash
# 启动调试模式
bun --inspect packages/opencode/src/index.ts

# 使用 Chrome DevTools 连接
# 打开 chrome://inspect
```

---

## 常见调试场景

### 调试工具执行

在 `packages/opencode/src/tool/` 目录下的工具文件中设置断点：

```typescript
// packages/opencode/src/tool/builtin/read.ts
execute: async (args) => {
  // 在这里设置断点
  const content = await fs.readFile(args.file_path, "utf-8")
  return content
}
```

### 调试会话流程

关键文件：

- `packages/opencode/src/session/session.ts` - 会话管理
- `packages/opencode/src/session/chat.ts` - 聊天处理
- `packages/opencode/src/session/message.ts` - 消息处理

### 调试 LLM 调用

关键文件：

- `packages/opencode/src/provider/provider.ts` - 提供商管理
- `packages/opencode/src/provider/model.ts` - 模型调用

---

## 性能分析

### 使用 Bun 内置分析器

```bash
# CPU 分析
bun --cpu-prof packages/opencode/src/index.ts

# 内存分析
bun --heap-prof packages/opencode/src/index.ts
```

### 分析 Server 性能

```bash
# 启动 Server 并记录性能
OPENCODE_LOG_LEVEL=debug bun dev -- serve

# 使用 curl 测试端点（默认端口 4096）
curl http://localhost:4096/          # 检查 Web 页面
curl http://localhost:4096/session   # 获取会话列表
curl http://localhost:4096/agent     # 获取 Agent 列表
curl http://localhost:4096/doc       # 获取 OpenAPI 文档
```

---

## 测试

### 运行单元测试

```bash
cd packages/opencode
bun test

# 运行特定测试文件
bun test src/tool/builtin/read.test.ts

# 监听模式
bun test --watch
```

### 运行 E2E 测试

```bash
cd packages/app
bun test:e2e

# 使用 UI 模式
bun test:e2e:ui
```

---

## 常见问题排查

### 工具执行失败

1. 检查工具参数是否正确
2. 查看日志中的错误信息
3. 确认权限配置

### LLM 调用超时

1. 检查网络连接
2. 确认 API Key 配置
3. 尝试降低 `maxTokens` 参数

### Server 启动失败

1. 检查端口是否被占用：`lsof -i :4096`
2. 查看日志中的错误信息
3. 确认环境变量配置

### SDK 连接失败

1. 确认 Server 已启动：`curl http://127.0.0.1:4096/`
2. 检查 baseUrl 是否正确
3. 如果使用认证，确认 `OPENCODE_SERVER_PASSWORD` 配置

---

## 环境变量参考

| 变量名                     | 说明              | 默认值     |
| -------------------------- | ----------------- | ---------- |
| `OPENCODE_LOG_LEVEL`       | 日志级别          | `info`     |
| `OPENCODE_SERVER_PASSWORD` | Server 认证密码   | 无         |
| `OPENCODE_SERVER_USERNAME` | Server 认证用户名 | `opencode` |
| `OPENCODE_CONFIG_CONTENT`  | 内联配置 JSON     | 无         |

---

## 下一步

- [Server 模式详解](./server-mode.md) - 了解 Server 模式的架构和使用
- [SDK 参考](../../packages/sdk/js/README.md) - SDK 完整 API 文档
- [插件开发](./plugin-development.md) - 创建自定义插件和工具
