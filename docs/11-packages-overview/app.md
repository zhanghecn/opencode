# App 模块

App 模块 (`@opencode-ai/app`) 是 OpenCode 的共享 Web UI 组件库，被 Desktop 和 Web 模块复用。

## 概述

```
┌─────────────────────────────────────────────────────────────┐
│                        App 模块                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    UI 组件                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Session │ │ Message │ │ Terminal│ │ Settings│   │   │
│  │  │  List   │ │  View   │ │  (PTY)  │ │  Panel  │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    状态管理                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │ Session │ │ Config  │ │ Provider│               │   │
│  │  │  Store  │ │  Store  │ │  Store  │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    服务层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │   API   │ │   SSE   │ │WebSocket│               │   │
│  │  │ Client  │ │ Events  │ │  (PTY)  │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 技术        | 用途           |
| ----------- | -------------- |
| SolidJS     | 响应式 UI 框架 |
| Vite        | 构建工具       |
| TailwindCSS | 样式框架       |
| ghostty-web | 终端模拟器     |
| Shiki       | 代码高亮       |
| Marked      | Markdown 渲染  |

## 目录结构

```
packages/app/
├── src/
│   ├── components/        # UI 组件
│   │   ├── session/       # 会话相关组件
│   │   ├── message/       # 消息相关组件
│   │   ├── terminal/      # 终端组件
│   │   └── settings/      # 设置组件
│   ├── stores/            # 状态管理
│   ├── services/          # API 服务
│   ├── hooks/             # 自定义 hooks
│   └── index.ts           # 入口文件
├── e2e/                   # E2E 测试
├── vite.config.ts         # Vite 配置
└── package.json
```

## 开发

### 启动开发服务器

```bash
cd packages/app
bun dev
```

默认在 `http://localhost:5173` 启动。

### 构建

```bash
bun build
```

### 运行测试

```bash
# E2E 测试
bun test:e2e

# UI 模式
bun test:e2e:ui

# 查看报告
bun test:e2e:report
```

## 核心组件

### SessionList

会话列表组件，显示所有会话并支持切换。

```tsx
import { SessionList } from "@opencode-ai/app"

;<SessionList sessions={sessions} currentSession={currentSession} onSelect={handleSelect} />
```

### MessageView

消息视图组件，渲染聊天消息。

```tsx
import { MessageView } from "@opencode-ai/app"

;<MessageView messages={messages} onRetry={handleRetry} />
```

### Terminal

终端组件，基于 ghostty-web。

```tsx
import { Terminal } from "@opencode-ai/app"

;<Terminal sessionId={sessionId} onData={handleData} />
```

## 状态管理

App 使用 SolidJS 的响应式系统进行状态管理：

```typescript
// stores/session.ts
import { createSignal, createResource } from "solid-js"

const [sessions, { refetch }] = createResource(fetchSessions)
const [currentSession, setCurrentSession] = createSignal<Session | null>(null)

export function useSession() {
  return {
    sessions,
    currentSession,
    setCurrentSession,
    refetch,
  }
}
```

## API 集成

App 通过 SDK 与 Server 通信：

```typescript
// services/api.ts
import { createOpencodeClient } from "@opencode-ai/sdk"

export const client = createOpencodeClient({
  baseUrl: import.meta.env.VITE_API_URL || "http://localhost:4096",
})
```

## 事件订阅

使用 SSE 订阅实时事件：

```typescript
// services/events.ts
export function subscribeEvents(onEvent: (event: Event) => void) {
  const eventSource = new EventSource(`${baseUrl}/event`)

  eventSource.onmessage = (e) => {
    const event = JSON.parse(e.data)
    onEvent(event)
  }

  return () => eventSource.close()
}
```

## 与其他模块的关系

### Desktop 模块

Desktop 模块导入 App 组件并添加原生功能：

```typescript
// packages/desktop/src/App.tsx
import { App as OpenCodeApp } from "@opencode-ai/app"

function App() {
  return (
    <TauriProvider>
      <OpenCodeApp />
    </TauriProvider>
  )
}
```

### Web 模块

Web 模块在特定页面嵌入 App 组件：

```astro
---
// packages/web/src/pages/app.astro
import { App } from "@opencode-ai/app"
---

<App client:only="solid-js" />
```

## 配置

### Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
  },
})
```

### 环境变量

| 变量           | 说明           | 默认值                  |
| -------------- | -------------- | ----------------------- |
| `VITE_API_URL` | API 服务器地址 | `http://localhost:4096` |

## 下一步

- [Web 模块](./web.md) - 了解官方网站
- [Desktop 模块](./desktop.md) - 了解桌面应用
