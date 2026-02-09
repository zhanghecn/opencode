# 模块总览

OpenCode 采用 Monorepo 架构，包含多个相互协作的模块。

## 架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OpenCode Monorepo                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                           用户界面层                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │
│  │  │   Desktop   │  │    Web      │  │   Console   │                 │   │
│  │  │   (Tauri)   │  │  (Astro)    │  │ (SolidStart)│                 │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │   │
│  │         │                │                │                         │   │
│  │         └────────────────┼────────────────┘                         │   │
│  │                          │                                          │   │
│  │                    ┌─────┴─────┐                                    │   │
│  │                    │    App    │  共享 Web UI                       │   │
│  │                    │ (SolidJS) │                                    │   │
│  │                    └─────┬─────┘                                    │   │
│  └──────────────────────────┼──────────────────────────────────────────┘   │
│                             │                                               │
│  ┌──────────────────────────┼──────────────────────────────────────────┐   │
│  │                          │        SDK 层                            │   │
│  │                    ┌─────┴─────┐                                    │   │
│  │                    │    SDK    │  客户端/服务端 SDK                  │   │
│  │                    └─────┬─────┘                                    │   │
│  └──────────────────────────┼──────────────────────────────────────────┘   │
│                             │                                               │
│  ┌──────────────────────────┼──────────────────────────────────────────┐   │
│  │                          │        核心层                            │   │
│  │                    ┌─────┴─────┐                                    │   │
│  │                    │ OpenCode  │  CLI + Server                      │   │
│  │                    │   Core    │                                    │   │
│  │                    └─────┬─────┘                                    │   │
│  │         ┌────────────────┼────────────────┐                         │   │
│  │   ┌─────┴─────┐    ┌─────┴─────┐    ┌─────┴─────┐                  │   │
│  │   │   Plugin  │    │    UI     │    │   Util    │                  │   │
│  │   └───────────┘    └───────────┘    └───────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 模块列表

| 模块                      | 包名                     | 说明               |
| ------------------------- | ------------------------ | ------------------ |
| [opencode](./opencode.md) | `opencode`               | 核心 CLI 和 Server |
| [app](./app.md)           | `@opencode-ai/app`       | 共享 Web UI 组件   |
| [web](./web.md)           | `@opencode-ai/web`       | 官方网站           |
| [desktop](./desktop.md)   | `@opencode-ai/desktop`   | 桌面应用           |
| [console](./console.md)   | `@opencode-ai/console-*` | 管理控制台         |
| sdk                       | `@opencode-ai/sdk`       | JavaScript SDK     |
| ui                        | `@opencode-ai/ui`        | UI 组件库          |
| util                      | `@opencode-ai/util`      | 工具函数           |
| plugin                    | `@opencode-ai/plugin`    | 插件系统           |

## 依赖关系

```
desktop ──────┐
              │
web ──────────┼──→ app ──→ sdk ──→ opencode
              │              │
console ──────┘              └──→ ui, util
```

## 技术栈

| 模块     | 技术栈                      |
| -------- | --------------------------- |
| opencode | Bun, TypeScript, Hono       |
| app      | SolidJS, Vite, TailwindCSS  |
| web      | Astro, Starlight            |
| desktop  | Tauri 2.x, Rust             |
| console  | SolidStart, Drizzle, Stripe |
| sdk      | TypeScript, OpenAPI         |
| ui       | SolidJS, TailwindCSS        |

## 开发命令

### 全局命令

```bash
# 安装所有依赖
bun install

# 类型检查所有模块
bun typecheck

# 启动 CLI 开发
bun dev
```

### 模块命令

```bash
# App 开发
cd packages/app && bun dev

# Web 开发
cd packages/web && bun dev

# Desktop 开发
cd packages/desktop && bun tauri dev

# Console 开发
cd packages/console/app && bun dev
```

## 构建产物

| 模块     | 构建命令          | 产物           |
| -------- | ----------------- | -------------- |
| opencode | `bun build`       | CLI 可执行文件 |
| app      | `bun build`       | 静态 Web 资源  |
| web      | `bun build`       | 静态网站       |
| desktop  | `bun tauri build` | 原生应用       |
| sdk      | `bun build`       | npm 包         |

## 下一步

- [App 模块](./app.md) - 了解共享 Web UI
- [Web 模块](./web.md) - 了解官方网站
- [Desktop 模块](./desktop.md) - 了解桌面应用
- [Console 模块](./console.md) - 了解管理控制台
