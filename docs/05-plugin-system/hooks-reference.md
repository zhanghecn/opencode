# 钩子函数参考

## 钩子函数签名

所有钩子函数遵循统一的签名模式：

```typescript
hookName?: (input: InputType, output: OutputType) => Promise<void>
```

- `input`: 只读的输入参数
- `output`: 可修改的输出对象

## 事件钩子

### event

监听系统事件。

```typescript
event?: (input: { event: Event }) => Promise<void>
```

**用途**: 监听会话、消息、工具执行等事件

**示例**:

```typescript
{
  event: async ({ event }) => {
    console.log("Event received:", event.type, event.properties)
  }
}
```

### config

配置加载时调用。

```typescript
config?: (input: Config) => Promise<void>
```

**用途**: 读取或修改配置

**示例**:

```typescript
{
  config: async (config) => {
    console.log("Config loaded:", config.username)
  }
}
```

## 聊天钩子

### chat.message

新消息接收时调用。

```typescript
"chat.message"?: (
  input: {
    sessionID: string
    agent?: string
    model?: { providerID: string; modelID: string }
    messageID?: string
    variant?: string
  },
  output: { message: UserMessage; parts: Part[] }
) => Promise<void>
```

**用途**: 修改用户消息或添加额外内容

**示例**:

```typescript
{
  "chat.message": async (input, output) => {
    // 添加时间戳到消息
    output.parts.push({
      type: "text",
      text: `[${new Date().toISOString()}]`
    })
  }
}
```

### chat.params

修改发送给 LLM 的参数。

```typescript
"chat.params"?: (
  input: {
    sessionID: string
    agent: string
    model: Model
    provider: ProviderContext
    message: UserMessage
  },
  output: {
    temperature: number
    topP: number
    topK: number
    options: Record<string, any>
  }
) => Promise<void>
```

**用途**: 动态调整 LLM 参数

**示例**:

```typescript
{
  "chat.params": async (input, output) => {
    // 对特定代理使用更高温度
    if (input.agent === "creative") {
      output.temperature = 0.9
    }
  }
}
```

### chat.headers

修改 API 请求头。

```typescript
"chat.headers"?: (
  input: {
    sessionID: string
    agent: string
    model: Model
    provider: ProviderContext
    message: UserMessage
  },
  output: { headers: Record<string, string> }
) => Promise<void>
```

**用途**: 添加自定义请求头

**示例**:

```typescript
{
  "chat.headers": async (input, output) => {
    output.headers["X-Custom-Header"] = "value"
  }
}
```

## 权限钩子

### permission.ask

权限请求时调用。

```typescript
"permission.ask"?: (
  input: Permission,
  output: { status: "ask" | "deny" | "allow" }
) => Promise<void>
```

**用途**: 自动处理权限请求

**示例**:

```typescript
{
  "permission.ask": async (input, output) => {
    // 自动允许读取特定目录
    if (input.permission === "read" && input.path?.startsWith("/safe/")) {
      output.status = "allow"
    }
  }
}
```

## 命令钩子

### command.execute.before

命令执行前调用。

```typescript
"command.execute.before"?: (
  input: {
    command: string
    sessionID: string
    arguments: string
  },
  output: { parts: Part[] }
) => Promise<void>
```

**用途**: 在命令执行前添加内容

**示例**:

```typescript
{
  "command.execute.before": async (input, output) => {
    if (input.command === "help") {
      output.parts.push({
        type: "text",
        text: "Custom help content..."
      })
    }
  }
}
```

## 工具钩子

### tool.execute.before

工具执行前调用。

```typescript
"tool.execute.before"?: (
  input: {
    tool: string
    sessionID: string
    callID: string
  },
  output: { args: any }
) => Promise<void>
```

**用途**: 修改工具参数

**示例**:

```typescript
{
  "tool.execute.before": async (input, output) => {
    if (input.tool === "bash") {
      // 记录命令
      console.log("Executing:", output.args.command)
    }
  }
}
```

### tool.execute.after

工具执行后调用。

```typescript
"tool.execute.after"?: (
  input: {
    tool: string
    sessionID: string
    callID: string
  },
  output: {
    title: string
    output: string
    metadata: any
  }
) => Promise<void>
```

**用途**: 修改工具输出

**示例**:

```typescript
{
  "tool.execute.after": async (input, output) => {
    if (input.tool === "read") {
      // 添加文件信息到输出
      output.metadata.readAt = new Date().toISOString()
    }
  }
}
```

## 实验性钩子

### experimental.chat.messages.transform

转换消息历史。

```typescript
"experimental.chat.messages.transform"?: (
  input: {},
  output: {
    messages: {
      info: Message
      parts: Part[]
    }[]
  }
) => Promise<void>
```

**用途**: 修改发送给 LLM 的消息历史

### experimental.chat.system.transform

转换系统提示词。

```typescript
"experimental.chat.system.transform"?: (
  input: { sessionID?: string; model: Model },
  output: { system: string[] }
) => Promise<void>
```

**用途**: 修改或添加系统提示词

**示例**:

```typescript
{
  "experimental.chat.system.transform": async (input, output) => {
    output.system.push("Additional system instruction...")
  }
}
```

### experimental.session.compacting

会话压缩前调用。

```typescript
"experimental.session.compacting"?: (
  input: { sessionID: string },
  output: { context: string[]; prompt?: string }
) => Promise<void>
```

**用途**: 自定义压缩提示词

### experimental.text.complete

文本完成后调用。

```typescript
"experimental.text.complete"?: (
  input: {
    sessionID: string
    messageID: string
    partID: string
  },
  output: { text: string }
) => Promise<void>
```

**用途**: 修改完成的文本

## 认证钩子

### auth

提供认证方法。

```typescript
auth?: {
  provider: string
  loader?: (auth, provider) => Promise<Record<string, any>>
  methods: AuthMethod[]
}
```

**用途**: 为 AI 提供商添加认证支持

**示例**:

```typescript
{
  auth: {
    provider: "my-provider",
    methods: [
      {
        type: "api",
        label: "API Key",
        prompts: [
          {
            type: "text",
            key: "apiKey",
            message: "Enter your API key",
          }
        ],
        authorize: async (inputs) => ({
          type: "success",
          key: inputs.apiKey,
        })
      }
    ]
  }
}
```

## 工具钩子

### tool

注册自定义工具。

```typescript
tool?: {
  [key: string]: ToolDefinition
}
```

**用途**: 添加自定义工具

**示例**:

```typescript
{
  tool: {
    "my-tool": {
      description: "My custom tool",
      args: {
        input: z.string().describe("Input parameter"),
      },
      execute: async (args, ctx) => {
        return `Result: ${args.input}`
      }
    }
  }
}
```

## 钩子执行顺序

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         钩子执行顺序                                         │
│                                                                             │
│  1. 插件按加载顺序执行                                                       │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ 内置插件 → 配置插件 → NPM 插件 → 本地插件                            ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  2. 同一钩子按插件顺序执行                                                   │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ for (const hook of hooks) {                                         ││
│     │   await hook[name]?.(input, output)                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  3. 后执行的插件可以覆盖前面的修改                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ // 插件 A                                                           ││
│     │ output.temperature = 0.5                                            ││
│     │ // 插件 B (后执行)                                                   ││
│     │ output.temperature = 0.8  // 最终值                                  ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 下一步

- [插件开发指南](./plugin-development.md)
- [MCP 集成](../06-mcp-integration/README.md)
