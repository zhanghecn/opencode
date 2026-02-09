# OpenCode 源码文档

OpenCode 是一个强大的 AI 编程助手 CLI 工具，支持多种 AI 提供商、可扩展的工具系统和灵活的定制化能力。

## 快速导航

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OpenCode 文档结构                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         核心系统                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ 架构概述    │ │ 会话系统    │ │ 工具系统    │ │ 代理系统    │   │   │
│  │  │ 00-arch     │ │ 01-session  │ │ 02-tool     │ │ 03-agent    │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         扩展系统                                     │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │   │
│  │  │ 技能系统    │ │ 插件系统    │ │ MCP 集成    │ │ 提供商系统  │   │   │
│  │  │ 04-skill    │ │ 05-plugin   │ │ 06-mcp      │ │ 07-provider │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         开发与 SDK                                  │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │   │
│  │  │ 开发指南    │ │ SDK 文档    │ │ 模块说明    │                   │   │
│  │  │ 09-dev      │ │ 10-sdk      │ │ 11-packages │                   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         实践指南                                     │   │
│  │  ┌───────────────────────────────────────────────────────────────┐ │   │
│  │  │ 定制化指南 (08-customization-guide)                            │ │   │
│  │  │ - 构建你的智能体                                                │ │   │
│  │  │ - 多智能体系统                                                  │ │   │
│  │  └───────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 文档目录

| 章节                                       | 内容                             | 适合人群   |
| ------------------------------------------ | -------------------------------- | ---------- |
| [00-架构概述](./00-architecture/)          | 整体架构、数据流、扩展点         | 所有开发者 |
| [01-会话系统](./01-session-system/)        | 会话生命周期、消息处理、LLM 交互 | 核心开发者 |
| [02-工具系统](./02-tool-system/)           | 工具定义、内置工具、自定义工具   | 工具开发者 |
| [03-代理系统](./03-agent-system/)          | 代理类型、自定义代理、多代理协作 | 代理开发者 |
| [04-技能系统](./04-skill-system/)          | 技能定义、技能开发               | 技能开发者 |
| [05-插件系统](./05-plugin-system/)         | 钩子函数、插件开发               | 插件开发者 |
| [06-MCP 集成](./06-mcp-integration/)       | MCP 配置、服务器开发             | MCP 开发者 |
| [07-提供商系统](./07-provider-system/)     | 多提供商支持、模型配置           | 运维人员   |
| [08-定制化指南](./08-customization-guide/) | 构建智能体、多智能体系统         | 所有开发者 |
| [09-开发指南](./09-development-guide/)     | 开发环境、调试、Server 模式      | 贡献者     |
| [10-SDK](./10-sdk/)                        | SDK 使用、客户端/服务端 API      | SDK 用户   |
| [11-模块说明](./11-packages-overview/)     | App、Web、Desktop、Console       | 架构了解   |

## 快速开始

### 安装

```bash
# 使用 npm
npm install -g opencode

# 使用 bun
bun install -g opencode
```

### 基本使用

```bash
# 启动交互式会话
opencode

# 使用特定模型
opencode --model anthropic/claude-sonnet-4-20250514

# 执行单次命令
opencode -p "解释这段代码"
```

### 配置文件

在项目根目录创建 `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "agent": {},
  "permission": {},
  "mcp": {},
  "plugin": []
}
```

## 核心概念

### 会话 (Session)

会话是用户与 AI 交互的基本单位，管理消息历史和上下文。

```
用户输入 → 消息处理 → LLM 调用 → 工具执行 → 响应输出
```

[了解更多 →](./01-session-system/)

### 工具 (Tool)

工具是 AI 可以调用的功能单元，如文件操作、代码执行等。

```typescript
Tool.define("my-tool", () => ({
  description: "工具描述",
  parameters: z.object({ input: z.string() }),
  execute: async (args) => `结果: ${args.input}`,
}))
```

[了解更多 →](./02-tool-system/)

### 代理 (Agent)

代理定义了 AI 的行为模式、权限和可用工具。

```json
{
  "agent": {
    "my-agent": {
      "name": "My Agent",
      "mode": "primary",
      "prompt": "你是一个专业助手..."
    }
  }
}
```

[了解更多 →](./03-agent-system/)

### 技能 (Skill)

技能是可复用的提示词模板，提供专业领域知识。

```markdown
---
name: my-skill
description: 技能描述
---

# 技能内容
```

[了解更多 →](./04-skill-system/)

### 插件 (Plugin)

插件通过钩子函数扩展 OpenCode 的功能。

```typescript
const MyPlugin: Plugin = async (input) => ({
  event: async ({ event }) => {
    /* 处理事件 */
  },
  tool: {
    /* 自定义工具 */
  },
})
```

[了解更多 →](./05-plugin-system/)

## 扩展方式对比

| 扩展方式   | 复杂度     | 能力       | 适用场景       |
| ---------- | ---------- | ---------- | -------------- |
| 配置文件   | ⭐         | 基础定制   | 调整参数、权限 |
| 技能       | ⭐⭐       | 提示词扩展 | 专业领域知识   |
| 自定义工具 | ⭐⭐⭐     | 功能扩展   | 新增操作能力   |
| 插件       | ⭐⭐⭐⭐   | 深度定制   | 钩子函数、认证 |
| MCP 服务器 | ⭐⭐⭐⭐   | 外部集成   | 第三方服务     |
| 源码修改   | ⭐⭐⭐⭐⭐ | 完全控制   | 核心逻辑修改   |

## 常见用例

### 1. 创建专业代理

为特定领域创建专业代理：

```json
{
  "agent": {
    "frontend-dev": {
      "name": "Frontend Developer",
      "description": "Expert in React and TypeScript",
      "mode": "primary",
      "permission": {
        "write": { "src/components/**": "allow" }
      }
    }
  }
}
```

[详细指南 →](./08-customization-guide/build-your-agent.md)

### 2. 构建多智能体系统

协调多个专业代理完成复杂任务：

```
主代理 (协调者)
    │
    ├─→ 前端代理
    ├─→ 后端代理
    └─→ 测试代理
```

[详细指南 →](./08-customization-guide/multi-agent-system.md)

### 3. 集成外部服务

通过 MCP 集成外部工具和数据源：

```json
{
  "mcp": {
    "database": {
      "type": "local",
      "command": ["node", "db-server.js"]
    }
  }
}
```

[详细指南 →](./06-mcp-integration/)

### 4. 使用多个 AI 提供商

配置不同任务使用不同模型：

```json
{
  "agent": {
    "build": { "model": "anthropic/claude-sonnet-4-20250514" },
    "explore": { "model": "anthropic/claude-haiku-3-5-20241022" }
  }
}
```

[详细指南 →](./07-provider-system/)

## 关键文件路径

| 模块    | 路径                              | 说明           |
| ------- | --------------------------------- | -------------- |
| 入口    | `packages/opencode/src/index.ts`  | CLI 入口点     |
| 会话    | `packages/opencode/src/session/`  | 会话管理       |
| 工具    | `packages/opencode/src/tool/`     | 工具系统       |
| 代理    | `packages/opencode/src/agent/`    | 代理定义       |
| 技能    | `packages/opencode/src/skill/`    | 技能加载       |
| 插件    | `packages/opencode/src/plugin/`   | 插件系统       |
| MCP     | `packages/opencode/src/mcp/`      | MCP 集成       |
| 提供商  | `packages/opencode/src/provider/` | AI 提供商      |
| Server  | `packages/opencode/src/server/`   | API 服务器     |
| SDK     | `packages/sdk/js/src/`            | JavaScript SDK |
| App     | `packages/app/src/`               | Web UI 组件    |
| Desktop | `packages/desktop/`               | 桌面应用       |
| Console | `packages/console/`               | 管理控制台     |

## 学习路径

### 初学者

1. 阅读 [架构概述](./00-architecture/) 了解整体结构
2. 学习 [会话系统](./01-session-system/) 理解核心流程
3. 尝试 [定制化指南](./08-customization-guide/) 创建简单代理

### 工具开发者

1. 深入 [工具系统](./02-tool-system/) 了解工具定义
2. 参考 [内置工具分析](./02-tool-system/builtin-tools.md)
3. 按照 [自定义工具指南](./02-tool-system/custom-tool-guide.md) 开发

### 插件开发者

1. 学习 [插件系统](./05-plugin-system/) 架构
2. 参考 [钩子函数参考](./05-plugin-system/hooks-reference.md)
3. 按照 [插件开发指南](./05-plugin-system/plugin-development.md) 开发

### 多智能体开发者

1. 理解 [代理系统](./03-agent-system/) 基础
2. 学习 [多代理协作模式](./03-agent-system/multi-agent-patterns.md)
3. 参考 [多智能体系统](./08-customization-guide/multi-agent-system.md) 实践

### SDK 开发者

1. 阅读 [SDK 概述](./10-sdk/) 了解 SDK 结构
2. 学习 [客户端 SDK](./10-sdk/client-sdk.md) API
3. 参考 [服务端 SDK](./10-sdk/server-sdk.md) 集成方式

### 贡献者

1. 阅读 [开发环境搭建](./09-development-guide/) 配置环境
2. 学习 [调试运行指南](./09-development-guide/debugging.md)
3. 了解 [模块说明](./11-packages-overview/) 理解架构

## 贡献指南

欢迎贡献代码和文档！请参考项目根目录的 `CONTRIBUTING.md`。

## 许可证

MIT License
