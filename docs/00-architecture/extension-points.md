# 扩展点总览

OpenCode 提供了多种扩展机制，允许用户自定义和扩展系统功能。

## 扩展点概览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              扩展点层次                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         用户级扩展 (最简单)                              ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            ││
│  │  │  Skill    │  │  Command  │  │  CLAUDE.md│  │  Config   │            ││
│  │  │  技能     │  │  命令     │  │  指令     │  │  配置     │            ││
│  │  │           │  │           │  │           │  │           │            ││
│  │  │ SKILL.md  │  │ /commit   │  │ 项目指令  │  │ 模型配置  │            ││
│  │  │ 文件定义  │  │ /review   │  │ 全局指令  │  │ 代理配置  │            ││
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         开发者级扩展 (中等)                              ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐                           ││
│  │  │  Plugin   │  │   MCP     │  │  Custom   │                           ││
│  │  │  插件     │  │  服务器   │  │  Tool     │                           ││
│  │  │           │  │           │  │  自定义   │                           ││
│  │  │ 钩子函数  │  │ 本地/远程 │  │  工具     │                           ││
│  │  │ 事件订阅  │  │ 工具/资源 │  │           │                           ││
│  │  └───────────┘  └───────────┘  └───────────┘                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         系统级扩展 (高级)                                ││
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐                           ││
│  │  │  Agent    │  │ Provider  │  │  Core     │                           ││
│  │  │  代理     │  │  提供商   │  │  核心     │                           ││
│  │  │           │  │           │  │           │                           ││
│  │  │ 自定义    │  │ 新 AI     │  │ 源码修改  │                           ││
│  │  │ 代理类型  │  │ 提供商    │  │           │                           ││
│  │  └───────────┘  └───────────┘  └───────────┘                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1. 技能扩展 (Skill)

技能是最简单的扩展方式，通过 Markdown 文件定义。

### 技能文件位置
```
~/.claude/skills/my-skill/SKILL.md          # 全局技能
.claude/skills/my-skill/SKILL.md            # 项目技能
.opencode/skill/my-skill/SKILL.md           # OpenCode 技能
```

### 技能文件格式
```markdown
---
name: my-skill
description: 技能描述
---

# 技能内容

这里是技能的详细说明和指令...
```

### 技能调用
```
/my-skill                    # 用户调用
Skill tool: my-skill         # 代理调用
```

详见: [技能系统文档](../04-skill-system/README.md)

---

## 2. 命令扩展 (Command)

命令是用户可以直接调用的快捷操作。

### 内置命令
- `/commit` - 提交代码
- `/review` - 代码审查
- `/help` - 帮助信息
- `/clear` - 清除会话

### 自定义命令
通过 MCP 提示词或技能实现自定义命令。

详见: [命令系统文档](../05-plugin-system/README.md)

---

## 3. 插件扩展 (Plugin)

插件提供更强大的扩展能力，包括钩子函数和自定义工具。

### 插件接口
```typescript
// packages/plugin/src/index.ts
export interface Hooks {
  // 消息钩子
  "message:pre"?: (input: MessageInput, output: MessageOutput) => Promise<void>
  "message:post"?: (input: MessageInput, output: MessageOutput) => Promise<void>

  // 工具钩子
  "tool:pre"?: (input: ToolInput, output: ToolOutput) => Promise<void>
  "tool:post"?: (input: ToolInput, output: ToolOutput) => Promise<void>

  // 认证钩子
  auth?: AuthHook

  // 事件钩子
  event?: (input: { event: BusEvent }) => void

  // 自定义工具
  tool?: Record<string, ToolDefinition>
}
```

### 插件配置
```json
// opencode.json
{
  "plugin": [
    "my-plugin@1.0.0",
    "file://./my-local-plugin"
  ]
}
```

详见: [插件系统文档](../05-plugin-system/README.md)

---

## 4. MCP 扩展

MCP (Model Context Protocol) 允许集成外部工具和资源。

### MCP 配置
```json
// opencode.json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["node", "server.js"]
    },
    "remote-server": {
      "type": "remote",
      "url": "https://mcp.example.com"
    }
  }
}
```

### MCP 功能
- **工具**: 外部工具调用
- **资源**: 外部数据访问
- **提示词**: 预定义提示模板

详见: [MCP 集成文档](../06-mcp-integration/README.md)

---

## 5. 自定义工具 (Custom Tool)

通过代码定义新工具。

### 工具定义
```typescript
// .opencode/tool/my-tool.ts
import { z } from "zod"

export default {
  description: "我的自定义工具",
  args: {
    input: z.string().describe("输入参数"),
  },
  execute: async (args, ctx) => {
    // 工具逻辑
    return `处理结果: ${args.input}`
  },
}
```

### 工具位置
```
.opencode/tool/my-tool.ts       # 项目工具
.opencode/tools/my-tool.ts      # 项目工具 (复数)
~/.opencode/tool/my-tool.ts     # 全局工具
```

详见: [工具系统文档](../02-tool-system/README.md)

---

## 6. 代理扩展 (Agent)

代理定义了 AI 的行为模式和权限。

### 内置代理类型
| 代理 | 用途 | 权限 |
|------|------|------|
| `build` | 代码构建 | 完整工具访问 |
| `plan` | 任务规划 | 只读工具 |
| `explore` | 代码探索 | 只读工具 |
| `general` | 通用任务 | 完整工具访问 |
| `compaction` | 上下文压缩 | 无工具 |

### 自定义代理
```json
// opencode.json
{
  "agent": {
    "my-agent": {
      "description": "我的自定义代理",
      "tools": ["bash", "read", "write"],
      "system": "你是一个专门处理 X 任务的助手..."
    }
  }
}
```

详见: [代理系统文档](../03-agent-system/README.md)

---

## 7. 提供商扩展 (Provider)

添加新的 AI 提供商支持。

### 配置新提供商
```json
// opencode.json
{
  "provider": {
    "my-provider": {
      "name": "My Provider",
      "api": "https://api.my-provider.com/v1",
      "npm": "@ai-sdk/openai-compatible",
      "env": ["MY_PROVIDER_API_KEY"],
      "models": {
        "my-model": {
          "name": "My Model",
          "limit": {
            "context": 128000,
            "output": 4096
          }
        }
      }
    }
  }
}
```

详见: [提供商系统文档](../07-provider-system/README.md)

---

## 扩展点对比

| 扩展点 | 难度 | 功能范围 | 适用场景 |
|--------|------|----------|----------|
| Skill | ⭐ | 提示词增强 | 工作流程、最佳实践 |
| Command | ⭐ | 快捷操作 | 常用操作封装 |
| CLAUDE.md | ⭐ | 项目指令 | 项目特定规则 |
| Config | ⭐⭐ | 配置调整 | 模型、代理配置 |
| Plugin | ⭐⭐⭐ | 钩子、工具 | 深度集成 |
| MCP | ⭐⭐⭐ | 外部工具 | 第三方服务集成 |
| Custom Tool | ⭐⭐⭐ | 新工具 | 特定功能实现 |
| Agent | ⭐⭐⭐⭐ | 行为模式 | 专业化代理 |
| Provider | ⭐⭐⭐⭐ | AI 提供商 | 新模型支持 |

## 下一步
- [会话系统详解](../01-session-system/README.md)
- [工具系统详解](../02-tool-system/README.md)
- [定制化指南](../08-customization-guide/build-your-agent.md)
