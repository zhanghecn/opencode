# 插件系统概述

插件系统是 OpenCode 的核心扩展机制，允许开发者通过钩子函数扩展和定制 AI 代理的行为。

## 插件系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              插件系统架构                                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         Plugin (插件定义)                              │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ type Plugin = (input: PluginInput) => Promise<Hooks>            │ │ │
│  │  │                                                                 │ │ │
│  │  │ PluginInput:                                                    │ │ │
│  │  │ - client: OpenCode SDK 客户端                                   │ │ │
│  │  │ - project: 项目信息                                             │ │ │
│  │  │ - directory: 当前目录                                           │ │ │
│  │  │ - worktree: Git 工作树根目录                                    │ │ │
│  │  │ - serverUrl: 服务器 URL                                         │ │ │
│  │  │ - $: Bun Shell                                                  │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         Hooks (钩子函数)                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - event: 事件监听                                                │ │ │
│  │  │ - config: 配置加载                                               │ │ │
│  │  │ - tool: 自定义工具                                               │ │ │
│  │  │ - auth: 认证钩子                                                 │ │ │
│  │  │ - chat.message: 消息处理                                         │ │ │
│  │  │ - chat.params: LLM 参数修改                                      │ │ │
│  │  │ - permission.ask: 权限请求                                       │ │ │
│  │  │ - tool.execute.before/after: 工具执行前后                        │ │ │
│  │  │ - experimental.*: 实验性钩子                                     │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         插件来源                                       │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐         │ │
│  │  │   内置插件       │ │   NPM 插件       │ │   本地插件       │         │ │
│  │  │ INTERNAL_PLUGINS│ │ package@version │ │ file://path     │         │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 关键文件

| 文件                           | 职责             |
| ------------------------------ | ---------------- |
| `plugin/index.ts`              | 插件加载和管理   |
| `packages/plugin/src/index.ts` | 插件类型定义     |
| `packages/plugin/src/tool.ts`  | 工具定义辅助函数 |

## 插件加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         插件加载流程                                         │
│                                                                             │
│  1. 加载内置插件                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const INTERNAL_PLUGINS = [CodexAuthPlugin, CopilotAuthPlugin]       ││
│     │ for (const plugin of INTERNAL_PLUGINS) {                            ││
│     │   const init = await plugin(input)                                  ││
│     │   hooks.push(init)                                                  ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 加载配置的插件                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const plugins = [...config.plugin, ...BUILTIN]                      ││
│     │ for (let plugin of plugins) {                                       ││
│     │   // 安装 NPM 包或使用本地文件                                       ││
│     │   if (!plugin.startsWith("file://")) {                              ││
│     │     plugin = await BunProc.install(pkg, version)                    ││
│     │   }                                                                 ││
│     │   const mod = await import(plugin)                                  ││
│     │   // 初始化插件                                                      ││
│     │   for (const fn of Object.values(mod)) {                            ││
│     │     hooks.push(await fn(input))                                     ││
│     │   }                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 初始化钩子                                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ // 调用 config 钩子                                                  ││
│     │ for (const hook of hooks) {                                         ││
│     │   await hook.config?.(config)                                       ││
│     │ }                                                                   ││
│     │ // 订阅事件总线                                                      ││
│     │ Bus.subscribeAll(async (input) => {                                 ││
│     │   for (const hook of hooks) {                                       ││
│     │     hook.event?.({ event: input })                                  ││
│     │   }                                                                 ││
│     │ })                                                                  ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 钩子触发机制

```typescript
// 文件: packages/opencode/src/plugin/index.ts

export async function trigger<Name extends keyof Hooks>(name: Name, input: Input, output: Output): Promise<Output> {
  for (const hook of await state().then((x) => x.hooks)) {
    const fn = hook[name]
    if (!fn) continue
    await fn(input, output)
  }
  return output
}
```

## 可用钩子列表

| 钩子                  | 用途           | 输入                          | 输出                    |
| --------------------- | -------------- | ----------------------------- | ----------------------- |
| `event`               | 监听系统事件   | `{ event }`                   | -                       |
| `config`              | 配置加载时     | `Config`                      | -                       |
| `tool`                | 注册自定义工具 | -                             | `ToolDefinition`        |
| `auth`                | 认证处理       | -                             | `AuthHook`              |
| `chat.message`        | 消息接收时     | `{ sessionID, agent, model }` | `{ message, parts }`    |
| `chat.params`         | 修改 LLM 参数  | `{ sessionID, agent, model }` | `{ temperature, topP }` |
| `chat.headers`        | 修改请求头     | `{ sessionID, agent, model }` | `{ headers }`           |
| `permission.ask`      | 权限请求时     | `Permission`                  | `{ status }`            |
| `tool.execute.before` | 工具执行前     | `{ tool, sessionID }`         | `{ args }`              |
| `tool.execute.after`  | 工具执行后     | `{ tool, sessionID }`         | `{ title, output }`     |

## 下一步

- [钩子函数参考](./hooks-reference.md)
- [插件开发指南](./plugin-development.md)
