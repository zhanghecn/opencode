# Server 模式详解

Server 模式允许 OpenCode 作为 HTTP API 服务器运行，为 Web 和 Desktop 客户端提供后端服务。

## 概述

```
┌─────────────────────────────────────────────────────────────┐
│                      客户端                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Web App   │  │  Desktop    │  │   SDK       │         │
│  │  (浏览器)   │  │  (Tauri)    │  │  (Node.js)  │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                    HTTP/SSE/WebSocket                       │
│                          │                                  │
│  ┌───────────────────────┴───────────────────────────────┐ │
│  │                  OpenCode Server                       │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │ Session │ │  Tool   │ │ Provider│ │   MCP   │     │ │
│  │  │  API    │ │  API    │ │   API   │ │   API   │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 启动 Server

### 基本启动

```bash
# 使用默认配置启动
opencode serve

# 开发模式
bun dev -- serve
```

### 启动参数

| 参数          | 说明           | 默认值      |
| ------------- | -------------- | ----------- |
| `--hostname`  | 监听地址       | `127.0.0.1` |
| `--port`      | 监听端口       | `4096`      |
| `--mdns`      | 启用 mDNS 发现 | `false`     |
| `--log-level` | 日志级别       | `info`      |

```bash
# 指定端口和地址
opencode serve --hostname 0.0.0.0 --port 8080

# 启用 mDNS
opencode serve --mdns
```

### 安全配置

```bash
# 设置认证密码
export OPENCODE_SERVER_PASSWORD="your-password"
export OPENCODE_SERVER_USERNAME="admin"  # 可选，默认 opencode

opencode serve
```

## API 端点

### 核心端点

| 端点     | 方法 | 说明             |
| -------- | ---- | ---------------- |
| `/doc`   | GET  | OpenAPI 文档     |
| `/event` | GET  | SSE 事件流       |
| `/path`  | GET  | 获取路径信息     |
| `/vcs`   | GET  | 获取版本控制信息 |

### 会话管理

| 端点                 | 方法   | 说明         |
| -------------------- | ------ | ------------ |
| `/session`           | GET    | 列出所有会话 |
| `/session`           | POST   | 创建新会话   |
| `/session/:id`       | GET    | 获取会话详情 |
| `/session/:id`       | DELETE | 删除会话     |
| `/session/:id/chat`  | POST   | 发送消息     |
| `/session/:id/abort` | POST   | 中止当前操作 |

### 项目管理

| 端点            | 方法 | 说明         |
| --------------- | ---- | ------------ |
| `/project`      | GET  | 获取项目信息 |
| `/project/init` | POST | 初始化项目   |

### 配置管理

| 端点      | 方法 | 说明     |
| --------- | ---- | -------- |
| `/config` | GET  | 获取配置 |
| `/config` | PUT  | 更新配置 |

### 提供商管理

| 端点                  | 方法   | 说明       |
| --------------------- | ------ | ---------- |
| `/provider`           | GET    | 列出提供商 |
| `/provider/:id/model` | GET    | 列出模型   |
| `/auth/:providerID`   | PUT    | 设置认证   |
| `/auth/:providerID`   | DELETE | 删除认证   |

### MCP 管理

| 端点            | 方法 | 说明            |
| --------------- | ---- | --------------- |
| `/mcp`          | GET  | 列出 MCP 服务器 |
| `/mcp/:id/tool` | GET  | 列出 MCP 工具   |

### 文件操作

| 端点         | 方法 | 说明     |
| ------------ | ---- | -------- |
| `/file`      | GET  | 读取文件 |
| `/file`      | PUT  | 写入文件 |
| `/file/list` | GET  | 列出文件 |

### 终端 (PTY)

| 端点   | 方法      | 说明     |
| ------ | --------- | -------- |
| `/pty` | WebSocket | 终端连接 |

## 事件流 (SSE)

Server 通过 SSE 推送实时事件：

```typescript
// 连接事件流
const eventSource = new EventSource("http://localhost:4096/event")

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log("Event:", data.type, data.properties)
}
```

### 事件类型

| 事件类型               | 说明            |
| ---------------------- | --------------- |
| `server.connected`     | 连接成功        |
| `server.heartbeat`     | 心跳 (每 30 秒) |
| `session.created`      | 会话创建        |
| `session.updated`      | 会话更新        |
| `message.created`      | 消息创建        |
| `message.updated`      | 消息更新        |
| `message.part.updated` | 消息部分更新    |

## CORS 配置

Server 默认允许以下来源：

- `http://localhost:*`
- `http://127.0.0.1:*`
- `tauri://localhost`
- `http://tauri.localhost`
- `https://*.opencode.ai`

可通过 `--cors` 参数添加额外来源：

```bash
opencode serve --cors "https://my-app.com"
```

## 与客户端配合

### Web App

Web App 通过 HTTP API 与 Server 通信：

```typescript
// 使用 SDK
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  directory: "/path/to/project",
})

// 创建会话
const session = await client.session.create({})

// 发送消息
await client.session.chat(session.id, {
  content: "Hello",
})
```

### Desktop App

Desktop App (Tauri) 内嵌 Server 进程：

```typescript
// Desktop 启动时自动启动 Server
// 通过 Tauri 的 shell 插件管理进程
```

### SDK 集成

```typescript
import { createOpencode } from "@opencode-ai/sdk"

// 自动启动 Server 并创建客户端
const { client, server } = await createOpencode({
  port: 4096,
  hostname: "127.0.0.1",
})

// 使用客户端
const sessions = await client.session.list()

// 关闭 Server
server.close()
```

## 关键源文件

| 文件                                     | 说明          |
| ---------------------------------------- | ------------- |
| `packages/opencode/src/server/server.ts` | Server 主入口 |
| `packages/opencode/src/cli/cmd/serve.ts` | serve 命令    |
| `packages/opencode/src/server/routes/`   | API 路由      |
| `packages/opencode/src/server/event.ts`  | 事件处理      |

## 下一步

- [SDK 概述](../10-sdk/README.md) - 了解如何使用 SDK 与 Server 交互
