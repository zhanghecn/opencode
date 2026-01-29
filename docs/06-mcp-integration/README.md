# MCP 集成

MCP (Model Context Protocol) 是一个开放协议，允许 AI 应用与外部工具和数据源进行标准化通信。OpenCode 完整支持 MCP 协议。

## MCP 架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP 集成架构                                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         MCP 客户端                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - 连接 MCP 服务器                                                │ │ │
│  │  │ - 获取工具列表                                                   │ │ │
│  │  │ - 执行工具调用                                                   │ │ │
│  │  │ - 获取提示词和资源                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         传输层                                         │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │   Stdio 传输     │ │   HTTP 传输      │ │   SSE 传输       │         │ │
│  │  │ (本地进程)       │ │ (远程服务器)     │ │ (远程服务器)     │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         MCP 服务器                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - 工具 (Tools)                                                   │ │ │
│  │  │ - 提示词 (Prompts)                                               │ │ │
│  │  │ - 资源 (Resources)                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `mcp/index.ts` | MCP 客户端管理 |
| `mcp/oauth-provider.ts` | OAuth 认证提供者 |
| `mcp/oauth-callback.ts` | OAuth 回调处理 |
| `mcp/auth.ts` | MCP 认证存储 |

## MCP 配置

### 本地 MCP 服务器

```json
// opencode.json
{
  "mcp": {
    "my-local-server": {
      "type": "local",
      "command": ["node", "path/to/server.js"],
      "environment": {
        "API_KEY": "xxx"
      },
      "timeout": 30000
    }
  }
}
```

### 远程 MCP 服务器

```json
{
  "mcp": {
    "my-remote-server": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "headers": {
        "Authorization": "Bearer xxx"
      },
      "timeout": 30000
    }
  }
}
```

### 带 OAuth 的远程服务器

```json
{
  "mcp": {
    "oauth-server": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "oauth": {
        "clientId": "your-client-id",
        "clientSecret": "your-client-secret",
        "scope": "read write"
      }
    }
  }
}
```

### 禁用 MCP 服务器

```json
{
  "mcp": {
    "disabled-server": {
      "type": "local",
      "command": ["node", "server.js"],
      "enabled": false
    }
  }
}
```

## 配置选项

| 选项 | 类型 | 说明 |
|------|------|------|
| `type` | `"local"` \| `"remote"` | 服务器类型 |
| `command` | `string[]` | 本地服务器启动命令 |
| `url` | `string` | 远程服务器 URL |
| `environment` | `object` | 环境变量 (本地) |
| `headers` | `object` | HTTP 请求头 (远程) |
| `timeout` | `number` | 超时时间 (毫秒) |
| `enabled` | `boolean` | 是否启用 |
| `oauth` | `object` \| `false` | OAuth 配置 |

## MCP 连接流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MCP 连接流程                                         │
│                                                                             │
│  1. 读取配置                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const cfg = await Config.get()                                      ││
│     │ const config = cfg.mcp ?? {}                                        ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 创建传输层                                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ if (mcp.type === "local") {                                         ││
│     │   transport = new StdioClientTransport({                            ││
│     │     command: cmd, args, cwd, env                                    ││
│     │   })                                                                ││
│     │ } else {                                                            ││
│     │   transport = new StreamableHTTPClientTransport(url, { authProvider })││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 连接客户端                                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const client = new Client({ name: "opencode", version })            ││
│     │ await client.connect(transport)                                     ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  4. 获取工具列表                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const result = await client.listTools()                             ││
│     │ // 转换为 AI SDK 工具格式                                            ││
│     │ for (const mcpTool of result.tools) {                               ││
│     │   tools[name] = await convertMcpTool(mcpTool, client)               ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## MCP 状态

| 状态 | 说明 |
|------|------|
| `connected` | 已连接 |
| `disabled` | 已禁用 |
| `failed` | 连接失败 |
| `needs_auth` | 需要认证 |
| `needs_client_registration` | 需要客户端注册 |

## OAuth 认证流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OAuth 认证流程                                       │
│                                                                             │
│  1. 启动认证                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ opencode mcp auth <server-name>                                     ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 生成授权 URL                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const { authorizationUrl } = await MCP.startAuth(mcpName)           ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 打开浏览器                                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ await open(authorizationUrl)                                        ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  4. 等待回调                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const code = await McpOAuthCallback.waitForCallback(oauthState)     ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  5. 完成认证                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ await MCP.finishAuth(mcpName, code)                                 ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## MCP 工具转换

```typescript
// 将 MCP 工具转换为 AI SDK 工具
async function convertMcpTool(mcpTool: MCPToolDef, client: MCPClient): Promise<Tool> {
  const schema: JSONSchema7 = {
    ...mcpTool.inputSchema,
    type: "object",
    additionalProperties: false,
  }

  return dynamicTool({
    description: mcpTool.description ?? "",
    inputSchema: jsonSchema(schema),
    execute: async (args) => {
      return client.callTool({
        name: mcpTool.name,
        arguments: args,
      })
    },
  })
}
```

## MCP 命令

### 查看 MCP 状态

```bash
opencode mcp status
```

### 连接 MCP 服务器

```bash
opencode mcp connect <server-name>
```

### 断开 MCP 服务器

```bash
opencode mcp disconnect <server-name>
```

### OAuth 认证

```bash
opencode mcp auth <server-name>
```

### 移除认证

```bash
opencode mcp remove-auth <server-name>
```

## 创建 MCP 服务器

### 基本模板

```typescript
// my-mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

const server = new Server({
  name: "my-mcp-server",
  version: "1.0.0",
})

// 注册工具
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "my-tool",
      description: "My custom tool",
      inputSchema: {
        type: "object",
        properties: {
          input: { type: "string", description: "Input parameter" },
        },
        required: ["input"],
      },
    },
  ],
}))

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
  if (request.params.name === "my-tool") {
    const { input } = request.params.arguments
    return {
      content: [{ type: "text", text: `Processed: ${input}` }],
    }
  }
  throw new Error(`Unknown tool: ${request.params.name}`)
})

// 启动服务器
const transport = new StdioServerTransport()
await server.connect(transport)
```

### 配置使用

```json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["bun", "run", "my-mcp-server.ts"]
    }
  }
}
```

## 最佳实践

### 1. 超时配置

```json
{
  "mcp": {
    "slow-server": {
      "type": "remote",
      "url": "https://slow.example.com",
      "timeout": 60000
    }
  }
}
```

### 2. 环境变量隔离

```json
{
  "mcp": {
    "secure-server": {
      "type": "local",
      "command": ["node", "server.js"],
      "environment": {
        "API_KEY": "${MCP_API_KEY}"
      }
    }
  }
}
```

### 3. 错误处理

MCP 服务器应该返回有意义的错误信息：

```typescript
server.setRequestHandler("tools/call", async (request) => {
  try {
    // 工具逻辑
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Error: ${error.message}` }],
    }
  }
})
```

## 下一步
- [提供商系统](../07-provider-system/README.md)
- [定制化指南](../08-customization-guide/build-your-agent.md)
