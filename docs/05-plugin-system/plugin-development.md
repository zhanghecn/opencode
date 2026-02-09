# 插件开发指南

## 插件结构

### 基本模板

```typescript
// my-plugin.ts
import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin"

const MyPlugin: Plugin = async (input: PluginInput): Promise<Hooks> => {
  // 初始化逻辑
  console.log("Plugin initialized for project:", input.project.name)

  return {
    // 钩子函数
  }
}

export default MyPlugin
```

### 完整示例

```typescript
// my-plugin.ts
import type { Plugin, PluginInput, Hooks } from "@opencode-ai/plugin"
import { tool } from "@opencode-ai/plugin"

const MyPlugin: Plugin = async (input: PluginInput): Promise<Hooks> => {
  const { client, project, directory, worktree, serverUrl, $ } = input

  return {
    // 配置钩子
    config: async (config) => {
      console.log("Config loaded:", config.username)
    },

    // 事件监听
    event: async ({ event }) => {
      if (event.type === "session.created") {
        console.log("New session:", event.properties.sessionID)
      }
    },

    // 消息处理
    "chat.message": async (input, output) => {
      // 添加自定义内容
    },

    // LLM 参数修改
    "chat.params": async (input, output) => {
      if (input.agent === "creative") {
        output.temperature = 0.9
      }
    },

    // 自定义工具
    tool: {
      "my-tool": tool({
        description: "My custom tool",
        args: {
          input: tool.schema.string().describe("Input parameter"),
        },
        execute: async (args, ctx) => {
          return `Processed: ${args.input}`
        },
      }),
    },
  }
}

export default MyPlugin
```

## 插件配置

### 在 opencode.json 中配置

```json
{
  "plugin": ["my-plugin@1.0.0", "file:///path/to/local/plugin.ts", "@org/plugin@latest"]
}
```

### 插件来源

| 来源     | 格式                     | 示例                          |
| -------- | ------------------------ | ----------------------------- |
| NPM      | `package@version`        | `my-plugin@1.0.0`             |
| 本地文件 | `file://path`            | `file:///home/user/plugin.ts` |
| 作用域包 | `@scope/package@version` | `@org/plugin@1.0.0`           |

## 自定义工具开发

### 工具定义

```typescript
import { tool } from "@opencode-ai/plugin"

const myTool = tool({
  description: "工具描述，帮助 LLM 理解何时使用",
  args: {
    // 使用 Zod schema 定义参数
    path: tool.schema.string().describe("文件路径"),
    format: tool.schema.enum(["json", "yaml"]).optional().describe("输出格式"),
    count: tool.schema.number().default(10).describe("数量"),
  },
  execute: async (args, ctx) => {
    // ctx 包含执行上下文
    const { sessionID, messageID, agent, directory, worktree, abort } = ctx

    // 更新进度
    ctx.metadata({
      title: "处理中...",
      metadata: { progress: 0.5 },
    })

    // 请求权限
    await ctx.ask({
      permission: "custom_permission",
      patterns: [args.path],
      always: [],
      metadata: {},
    })

    // 执行逻辑
    const result = await processFile(args.path)

    // 返回字符串结果
    return JSON.stringify(result, null, 2)
  },
})
```

### 工具上下文

```typescript
type ToolContext = {
  sessionID: string // 会话 ID
  messageID: string // 消息 ID
  agent: string // 当前代理
  directory: string // 项目目录
  worktree: string // Git 工作树根目录
  abort: AbortSignal // 取消信号

  // 更新元数据
  metadata(input: { title?: string; metadata?: Record<string, any> }): void

  // 请求权限
  ask(input: { permission: string; patterns: string[]; always: string[]; metadata: Record<string, any> }): Promise<void>
}
```

## 认证插件开发

### OAuth 认证

```typescript
const AuthPlugin: Plugin = async (input) => {
  return {
    auth: {
      provider: "my-provider",
      methods: [
        {
          type: "oauth",
          label: "Sign in with MyProvider",
          authorize: async () => {
            // 启动 OAuth 流程
            const authUrl = "https://provider.com/oauth/authorize"

            return {
              url: authUrl,
              instructions: "Click the link to authorize",
              method: "auto",
              callback: async () => {
                // 等待回调
                const tokens = await waitForCallback()
                return {
                  type: "success",
                  refresh: tokens.refresh_token,
                  access: tokens.access_token,
                  expires: tokens.expires_in,
                }
              },
            }
          },
        },
      ],
    },
  }
}
```

### API Key 认证

```typescript
const AuthPlugin: Plugin = async (input) => {
  return {
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
              placeholder: "sk-...",
              validate: (value) => {
                if (!value.startsWith("sk-")) {
                  return "API key must start with sk-"
                }
                return undefined
              },
            },
          ],
          authorize: async (inputs) => {
            // 验证 API key
            const valid = await validateKey(inputs.apiKey)
            if (valid) {
              return {
                type: "success",
                key: inputs.apiKey,
              }
            }
            return { type: "failed" }
          },
        },
      ],
    },
  }
}
```

## 事件监听

### 可用事件类型

```typescript
// 会话事件
"session.created"
"session.updated"
"session.deleted"

// 消息事件
"message.created"
"message.updated"
"message.part.updated"

// 工具事件
"tool.started"
"tool.completed"
"tool.failed"

// 错误事件
"error"
```

### 事件监听示例

```typescript
{
  event: async ({ event }) => {
    switch (event.type) {
      case "session.created":
        console.log("New session:", event.properties.sessionID)
        break
      case "tool.completed":
        console.log("Tool completed:", event.properties.tool)
        break
      case "error":
        console.error("Error:", event.properties.error)
        break
    }
  }
}
```

## 使用 SDK 客户端

```typescript
const MyPlugin: Plugin = async (input) => {
  const { client } = input

  return {
    "chat.message": async (input, output) => {
      // 获取会话信息
      const session = await client.session.get({
        id: input.sessionID,
      })

      // 获取消息历史
      const messages = await client.message.list({
        sessionID: input.sessionID,
      })

      // 创建新消息
      await client.message.create({
        sessionID: input.sessionID,
        role: "user",
        content: "Hello",
      })
    },
  }
}
```

## 使用 Bun Shell

```typescript
const MyPlugin: Plugin = async (input) => {
  const { $ } = input

  return {
    tool: {
      "run-script": tool({
        description: "Run a shell script",
        args: {
          script: tool.schema.string(),
        },
        execute: async (args, ctx) => {
          // 使用 Bun Shell 执行命令
          const result = await $`${args.script}`.text()
          return result
        },
      }),
    },
  }
}
```

## 发布插件

### package.json

```json
{
  "name": "my-opencode-plugin",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "@opencode-ai/plugin": "^1.0.0"
  },
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

### 发布到 NPM

```bash
npm publish
```

### 使用插件

```json
// opencode.json
{
  "plugin": ["my-opencode-plugin@1.0.0"]
}
```

## 最佳实践

### 1. 错误处理

```typescript
{
  "tool.execute.before": async (input, output) => {
    try {
      // 可能失败的操作
    } catch (error) {
      console.error("Plugin error:", error)
      // 不要抛出错误，避免影响其他插件
    }
  }
}
```

### 2. 性能考虑

```typescript
{
  // 避免在频繁调用的钩子中执行耗时操作
  event: async ({ event }) => {
    // 快速返回，不阻塞
    setImmediate(() => {
      // 异步处理
    })
  }
}
```

### 3. 清理资源

```typescript
const MyPlugin: Plugin = async (input) => {
  // 初始化资源
  const connection = await createConnection()

  // 监听进程退出
  process.on("exit", () => {
    connection.close()
  })

  return {
    // ...
  }
}
```

## 下一步

- [MCP 集成](../06-mcp-integration/README.md)
- [提供商系统](../07-provider-system/README.md)
