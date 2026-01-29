# 客户端 SDK

客户端 SDK 提供与 OpenCode Server 交互的完整 API。

## 创建客户端

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

const client = createOpencodeClient({
  baseUrl: "http://localhost:4096",
  directory: "/path/to/project"  // 可选，指定项目目录
})
```

## 会话管理 API

### 列出会话

```typescript
const sessions = await client.session.list()

for (const session of sessions) {
  console.log(`${session.id}: ${session.title}`)
}
```

### 创建会话

```typescript
const session = await client.session.create({
  title: "New Session"  // 可选
})

console.log(`Created session: ${session.id}`)
```

### 获取会话

```typescript
const session = await client.session.get(sessionId)

console.log(`Title: ${session.title}`)
console.log(`Created: ${session.createdAt}`)
```

### 删除会话

```typescript
await client.session.delete(sessionId)
```

### 更新会话

```typescript
await client.session.update(sessionId, {
  title: "Updated Title"
})
```

## 消息发送 API

### 发送消息

```typescript
// 发送文本消息
await client.session.chat(sessionId, {
  content: "Hello, OpenCode!"
})

// 发送带附件的消息
await client.session.chat(sessionId, {
  content: "分析这个文件",
  attachments: ["/path/to/file.ts"]
})
```

### 中止操作

```typescript
// 中止当前正在进行的操作
await client.session.abort(sessionId)
```

### 获取消息

```typescript
const messages = await client.message.list(sessionId)

for (const message of messages) {
  console.log(`[${message.role}]: ${message.content}`)
}
```

## 事件订阅

使用 SSE 订阅实时事件：

```typescript
// 创建 EventSource 连接
const eventSource = new EventSource(
  `http://localhost:4096/event?directory=${encodeURIComponent(directory)}`
)

// 监听消息
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case "message.created":
      console.log("New message:", data.properties)
      break
    case "message.updated":
      console.log("Message updated:", data.properties)
      break
    case "message.part.updated":
      console.log("Part updated:", data.properties)
      break
  }
}

// 错误处理
eventSource.onerror = (error) => {
  console.error("SSE error:", error)
}

// 关闭连接
eventSource.close()
```

## 项目管理 API

### 获取项目信息

```typescript
const project = await client.project.get()

console.log(`Name: ${project.name}`)
console.log(`Path: ${project.path}`)
```

### 初始化项目

```typescript
await client.project.init()
```

### 获取路径信息

```typescript
const paths = await client.path.get()

console.log(`Home: ${paths.home}`)
console.log(`State: ${paths.state}`)
console.log(`Config: ${paths.config}`)
console.log(`Directory: ${paths.directory}`)
```

## 配置管理 API

### 获取配置

```typescript
const config = await client.config.get()

console.log(`Model: ${config.model}`)
```

### 更新配置

```typescript
await client.config.update({
  model: "anthropic/claude-sonnet-4-20250514"
})
```

## 提供商管理 API

### 列出提供商

```typescript
const providers = await client.provider.list()

for (const provider of providers) {
  console.log(`${provider.id}: ${provider.name}`)
}
```

### 列出模型

```typescript
const models = await client.provider.models(providerId)

for (const model of models) {
  console.log(`${model.id}: ${model.name}`)
}
```

### 设置认证

```typescript
await client.auth.set(providerId, {
  type: "api_key",
  apiKey: "your-api-key"
})
```

### 删除认证

```typescript
await client.auth.remove(providerId)
```

## MCP 管理 API

### 列出 MCP 服务器

```typescript
const servers = await client.mcp.list()

for (const server of servers) {
  console.log(`${server.id}: ${server.status}`)
}
```

### 列出 MCP 工具

```typescript
const tools = await client.mcp.tools(serverId)

for (const tool of tools) {
  console.log(`${tool.name}: ${tool.description}`)
}
```

## 文件操作 API

### 读取文件

```typescript
const content = await client.file.read("/path/to/file.ts")
console.log(content)
```

### 写入文件

```typescript
await client.file.write("/path/to/file.ts", "file content")
```

### 列出文件

```typescript
const files = await client.file.list("/path/to/directory")

for (const file of files) {
  console.log(file.name)
}
```

## 其他 API

### 获取代理列表

```typescript
const agents = await client.agent.list()

for (const agent of agents) {
  console.log(`${agent.id}: ${agent.name}`)
}
```

### 获取技能列表

```typescript
const skills = await client.skill.list()

for (const skill of skills) {
  console.log(`${skill.name}: ${skill.description}`)
}
```

### 获取命令列表

```typescript
const commands = await client.command.list()

for (const command of commands) {
  console.log(`${command.name}: ${command.description}`)
}
```

### 获取 VCS 信息

```typescript
const vcs = await client.vcs.get()

console.log(`Branch: ${vcs.branch}`)
```

## 完整示例

```typescript
import { createOpencodeClient } from "@opencode-ai/sdk"

async function main() {
  // 创建客户端
  const client = createOpencodeClient({
    baseUrl: "http://localhost:4096",
    directory: process.cwd()
  })

  // 创建会话
  const session = await client.session.create({
    title: "Code Review"
  })

  // 设置事件监听
  const eventSource = new EventSource(
    `http://localhost:4096/event?directory=${encodeURIComponent(process.cwd())}`
  )

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    if (data.type === "message.part.updated") {
      process.stdout.write(data.properties.content || "")
    }
  }

  // 发送消息
  await client.session.chat(session.id, {
    content: "Review the code in src/index.ts"
  })

  // 等待响应完成
  await new Promise(resolve => setTimeout(resolve, 30000))

  // 清理
  eventSource.close()
  await client.session.delete(session.id)
}

main().catch(console.error)
```

## 下一步

- [服务端 SDK](./server-sdk.md) - 了解如何启动和管理 Server
