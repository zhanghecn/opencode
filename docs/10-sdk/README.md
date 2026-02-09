# SDK 概述

OpenCode SDK (`@opencode-ai/sdk`) 提供了与 OpenCode Server 交互的客户端库。

## 安装

```bash
# npm
npm install @opencode-ai/sdk

# bun
bun add @opencode-ai/sdk

# pnpm
pnpm add @opencode-ai/sdk
```

## 包结构

```
@opencode-ai/sdk
├── index.ts          # 主入口 (createOpencode)
├── client.ts         # 客户端 SDK (createOpencodeClient)
└── server.ts         # 服务端 SDK (createOpencodeServer)
```

## 快速开始

### 方式一：自动管理 Server

```typescript
import { createOpencode } from "@opencode-ai/sdk"

// 自动启动 Server 并创建客户端
const { client, server } = await createOpencode({
  port: 4096,
  hostname: "127.0.0.1"
})

// 使用客户端
const sessions = await client.session.list()

// 创建会话
const session = await client.session.create({})

// 发送消息
await client.session.chat(session.id, {
  content: "Hello, OpenCode!"
})

// 完成后关闭 Server
server.close()
```

### 方式二：连接已有 Server

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

// 连接到已运行的 Server
const client = createOpencodeClient({
  baseUrl: "http://localhost:4096"
})

// 使用客户端
const sessions = await client.session.list()
```

### 方式三：仅启动 Server

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

// 启动 Server
const server = await createOpencodeServer({
  port: 4096,
  hostname: "127.0.0.1"
})

console.log(`Server running at ${server.url}`)

// 关闭 Server
server.close()
```

## 导出方式

SDK 提供多种导出方式：

```typescript
// 主入口 - 包含所有功能
import { createOpencode, createOpencodeClient, createOpencodeServer } from "@opencode-ai/sdk"

// 仅客户端
import { createOpencodeClient } from "@opencode-ai/sdk/client"

// 仅服务端
import { createOpencodeServer } from "@opencode-ai/sdk/server"
```

## 类型定义

SDK 自动从 OpenAPI 规范生成类型：

```typescript
import type { Session, Message, Provider } from "@opencode-ai/sdk"

// 使用类型
const session: Session = await client.session.get(sessionId)
```

## 配置选项

### createOpencode 选项

```typescript
interface Options {
  hostname?: string    // 默认 "127.0.0.1"
  port?: number        // 默认 4096
  signal?: AbortSignal // 用于取消
  timeout?: number     // 启动超时 (ms)，默认 5000
  config?: Config      // OpenCode 配置
}
```

### createOpencodeClient 选项

```typescript
interface Config {
  baseUrl?: string     // Server URL
  directory?: string   // 项目目录
  headers?: Record<string, string>  // 自定义请求头
  fetch?: typeof fetch // 自定义 fetch 实现
}
```

### createOpencodeServer 选项

```typescript
interface ServerOptions {
  hostname?: string    // 默认 "127.0.0.1"
  port?: number        // 默认 4096
  signal?: AbortSignal // 用于取消
  timeout?: number     // 启动超时 (ms)
  config?: Config      // OpenCode 配置
}
```

## 错误处理

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096"
})

try {
  const session = await client.session.get("invalid-id")
} catch (error) {
  if (error.status === 404) {
    console.log("Session not found")
  } else {
    console.error("Error:", error.message)
  }
}
```

## 下一步

- [客户端 SDK](./client-sdk.md) - 详细了解客户端 API
- [服务端 SDK](./server-sdk.md) - 详细了解服务端 API
