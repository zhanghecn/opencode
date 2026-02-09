# 服务端 SDK

服务端 SDK 提供启动和管理 OpenCode Server 的能力。

## 创建 Server

### 基本用法

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

const server = await createOpencodeServer({
  port: 4096,
  hostname: "127.0.0.1",
})

console.log(`Server running at ${server.url}`)

// 关闭 Server
server.close()
```

### 配置选项

```typescript
interface ServerOptions {
  hostname?: string // 监听地址，默认 "127.0.0.1"
  port?: number // 监听端口，默认 4096
  signal?: AbortSignal // 用于取消启动
  timeout?: number // 启动超时 (ms)，默认 5000
  config?: Config // OpenCode 配置
}
```

## 配置传递

可以通过 `config` 选项传递 OpenCode 配置：

```typescript
const server = await createOpencodeServer({
  port: 4096,
  config: {
    model: "anthropic/claude-sonnet-4-20250514",
    logLevel: "debug",
    agent: {
      "my-agent": {
        name: "My Agent",
        prompt: "You are a helpful assistant.",
      },
    },
  },
})
```

配置会通过 `OPENCODE_CONFIG_CONTENT` 环境变量传递给 Server 进程。

## 取消启动

使用 `AbortSignal` 取消 Server 启动：

```typescript
const controller = new AbortController()

// 5 秒后取消
setTimeout(() => controller.abort(), 5000)

try {
  const server = await createOpencodeServer({
    port: 4096,
    signal: controller.signal,
  })
} catch (error) {
  if (error.message === "Aborted") {
    console.log("Server startup was cancelled")
  }
}
```

## 启动超时

设置启动超时时间：

```typescript
try {
  const server = await createOpencodeServer({
    port: 4096,
    timeout: 10000, // 10 秒超时
  })
} catch (error) {
  console.error("Server failed to start:", error.message)
}
```

## 返回值

`createOpencodeServer` 返回一个对象：

```typescript
interface Server {
  url: string // Server URL，如 "http://127.0.0.1:4096"
  close(): void // 关闭 Server
}
```

## 创建 TUI

SDK 还提供启动 TUI (终端用户界面) 的功能：

```typescript
import { createOpencodeTui } from "@opencode-ai/sdk"

const tui = createOpencodeTui({
  project: "/path/to/project",
  model: "anthropic/claude-sonnet-4-20250514",
  session: "session-id", // 可选，恢复已有会话
  agent: "my-agent", // 可选，指定代理
})

// 关闭 TUI
tui.close()
```

### TUI 选项

```typescript
interface TuiOptions {
  project?: string // 项目目录
  model?: string // 使用的模型
  session?: string // 会话 ID
  agent?: string // 代理 ID
  signal?: AbortSignal // 用于取消
  config?: Config // OpenCode 配置
}
```

## 完整示例

### 启动 Server 并使用客户端

```typescript
import { createOpencode } from "@opencode-ai/sdk"

async function main() {
  // 启动 Server 并创建客户端
  const { client, server } = await createOpencode({
    port: 4096,
    config: {
      model: "anthropic/claude-sonnet-4-20250514",
    },
  })

  try {
    // 创建会话
    const session = await client.session.create({})

    // 发送消息
    await client.session.chat(session.id, {
      content: "Hello!",
    })

    // 获取消息
    const messages = await client.message.list(session.id)
    console.log("Messages:", messages)
  } finally {
    // 关闭 Server
    server.close()
  }
}

main().catch(console.error)
```

### 管理多个 Server

```typescript
import { createOpencodeServer, createOpencodeClient } from "@opencode-ai/sdk"

async function main() {
  // 启动多个 Server
  const server1 = await createOpencodeServer({ port: 4096 })
  const server2 = await createOpencodeServer({ port: 4097 })

  // 创建对应的客户端
  const client1 = createOpencodeClient({ baseUrl: server1.url })
  const client2 = createOpencodeClient({ baseUrl: server2.url })

  // 使用不同的 Server 处理不同的项目
  // ...

  // 关闭所有 Server
  server1.close()
  server2.close()
}
```

### 优雅关闭

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

async function main() {
  const server = await createOpencodeServer({ port: 4096 })

  // 处理进程信号
  process.on("SIGINT", () => {
    console.log("Shutting down...")
    server.close()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    console.log("Shutting down...")
    server.close()
    process.exit(0)
  })

  console.log(`Server running at ${server.url}`)
  console.log("Press Ctrl+C to stop")

  // 保持进程运行
  await new Promise(() => {})
}

main().catch(console.error)
```

## 实现原理

服务端 SDK 通过 `spawn` 启动 `opencode serve` 子进程：

```typescript
// 简化的实现
const proc = spawn("opencode", ["serve", `--port=${port}`], {
  env: {
    ...process.env,
    OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
  },
})

// 等待 Server 启动
const url = await waitForServerReady(proc)

return {
  url,
  close() {
    proc.kill()
  },
}
```

## 注意事项

1. **依赖 opencode CLI**: 服务端 SDK 需要系统中安装了 `opencode` CLI
2. **端口冲突**: 如果指定的端口被占用，启动会失败
3. **进程管理**: 确保在程序退出时调用 `server.close()` 清理子进程
4. **超时处理**: 默认 5 秒超时，复杂配置可能需要更长时间

## 下一步

- [模块总览](../11-packages-overview/README.md) - 了解 OpenCode 的模块结构
