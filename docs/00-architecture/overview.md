# OpenCode 架构概述

## 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLI 入口层                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  packages/opencode/src/index.ts                                         ││
│  │  - yargs 命令行解析                                                      ││
│  │  - 命令注册 (run, auth, agent, mcp, serve, web...)                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              核心业务层                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Session     │  │    Agent      │  │    Tool       │  │   Provider   │ │
│  │   会话管理     │  │    代理系统    │  │    工具系统    │  │   AI提供商   │ │
│  │               │  │               │  │               │  │              │ │
│  │ - 消息处理    │  │ - build       │  │ - bash        │  │ - anthropic  │ │
│  │ - LLM 交互   │  │ - plan        │  │ - read/write  │  │ - openai     │ │
│  │ - 上下文压缩  │  │ - explore     │  │ - edit        │  │ - bedrock    │ │
│  │ - 会话存储    │  │ - general     │  │ - glob/grep   │  │ - vertex     │ │
│  └───────────────┘  │ - compaction  │  │ - task        │  │ - ...        │ │
│                     └───────────────┘  │ - skill       │  └──────────────┘ │
│                                        │ - webfetch    │                   │
│                                        │ - websearch   │                   │
│                                        └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              扩展层                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │    Skill      │  │    Plugin     │  │     MCP       │  │   Command    │ │
│  │    技能系统    │  │    插件系统    │  │   MCP 集成    │  │   命令系统   │ │
│  │               │  │               │  │               │  │              │ │
│  │ - SKILL.md   │  │ - 钩子函数    │  │ - 本地 MCP   │  │ - /commit    │ │
│  │ - 技能加载    │  │ - 自定义工具  │  │ - 远程 MCP   │  │ - /review    │ │
│  │ - 技能执行    │  │ - 事件订阅    │  │ - OAuth 认证 │  │ - 自定义命令 │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              基础设施层                                      │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐ │
│  │   Storage     │  │     Bus       │  │    Config     │  │   Project    │ │
│  │   存储系统     │  │    事件总线    │  │    配置管理    │  │   项目管理   │ │
│  │               │  │               │  │               │  │              │ │
│  │ - 会话存储    │  │ - 事件发布    │  │ - opencode.json│ │ - VCS 集成  │ │
│  │ - 消息存储    │  │ - 事件订阅    │  │ - CLAUDE.md   │  │ - 工作目录   │ │
│  │ - 认证存储    │  │ - 全局事件    │  │ - 环境变量    │  │ - 实例管理   │ │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 模块职责表

| 模块         | 目录            | 职责                                             |
| ------------ | --------------- | ------------------------------------------------ |
| **Session**  | `src/session/`  | 会话生命周期管理、消息处理、LLM 交互、上下文压缩 |
| **Agent**    | `src/agent/`    | 代理定义、权限配置、提示词模板                   |
| **Tool**     | `src/tool/`     | 工具定义、工具注册、工具执行                     |
| **Provider** | `src/provider/` | AI 提供商集成、模型管理、SDK 加载                |
| **Skill**    | `src/skill/`    | 技能加载、技能解析、技能执行                     |
| **Plugin**   | `src/plugin/`   | 插件加载、钩子触发、自定义工具注册               |
| **MCP**      | `src/mcp/`      | MCP 客户端管理、工具/资源/提示词获取             |
| **Command**  | `src/command/`  | 命令定义、命令解析、命令执行                     |
| **Config**   | `src/config/`   | 配置加载、配置合并、Markdown 解析                |
| **Storage**  | `src/storage/`  | 数据持久化、文件存储                             |
| **Bus**      | `src/bus/`      | 事件发布订阅、全局事件管理                       |
| **Project**  | `src/project/`  | 项目检测、VCS 集成、实例管理                     |

## 关键文件路径

### 入口文件

- `packages/opencode/src/index.ts` - CLI 主入口

### 会话系统

- `packages/opencode/src/session/index.ts` - 会话管理
- `packages/opencode/src/session/prompt.ts` - 提示处理和主循环
- `packages/opencode/src/session/processor.ts` - 消息处理器
- `packages/opencode/src/session/llm.ts` - LLM 交互
- `packages/opencode/src/session/message-v2.ts` - 消息数据结构
- `packages/opencode/src/session/compaction.ts` - 上下文压缩
- `packages/opencode/src/session/system.ts` - 系统提示词

### 工具系统

- `packages/opencode/src/tool/tool.ts` - 工具定义接口
- `packages/opencode/src/tool/registry.ts` - 工具注册表
- `packages/opencode/src/tool/bash.ts` - Bash 工具
- `packages/opencode/src/tool/read.ts` - 文件读取工具
- `packages/opencode/src/tool/write.ts` - 文件写入工具
- `packages/opencode/src/tool/edit.ts` - 文件编辑工具
- `packages/opencode/src/tool/task.ts` - 子代理任务工具

### 代理系统

- `packages/opencode/src/agent/agent.ts` - 代理定义
- `packages/opencode/src/agent/prompt/` - 代理提示词模板

### 技能系统

- `packages/opencode/src/skill/skill.ts` - 技能加载
- `packages/opencode/src/tool/skill.ts` - 技能工具

### 插件系统

- `packages/opencode/src/plugin/index.ts` - 插件管理
- `packages/plugin/src/index.ts` - 插件类型定义

### MCP 集成

- `packages/opencode/src/mcp/index.ts` - MCP 客户端管理

### 提供商系统

- `packages/opencode/src/provider/provider.ts` - 提供商管理
- `packages/opencode/src/provider/models.ts` - 模型数据库

## 核心设计原则

### 1. 模块化设计

每个功能模块都是独立的命名空间 (namespace)，通过明确的接口进行交互。

### 2. 事件驱动

使用 Bus 事件总线进行模块间通信，降低耦合度。

### 3. 可扩展性

- **工具扩展**: 通过 `Tool.define()` 定义新工具
- **代理扩展**: 通过配置文件定义新代理
- **技能扩展**: 通过 SKILL.md 文件定义新技能
- **插件扩展**: 通过插件系统添加钩子和自定义工具
- **MCP 扩展**: 通过 MCP 协议集成外部工具

### 4. 配置优先

支持多层配置合并：

1. 默认配置
2. 全局配置 (`~/.opencode/opencode.json`)
3. 项目配置 (`.opencode/opencode.json`)
4. 环境变量
5. 命令行参数

## 下一步

- [数据流和消息流](./data-flow.md)
- [扩展点总览](./extension-points.md)
