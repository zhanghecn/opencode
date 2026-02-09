# Desktop 模块

Desktop 模块 (`@opencode-ai/desktop`) 是 OpenCode 的原生桌面应用，基于 Tauri 2.x 构建。

## 概述

```
┌─────────────────────────────────────────────────────────────┐
│                      Desktop 模块                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    前端 (Web)                        │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │              App 模块 (SolidJS)              │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │           Tauri 插件集成                     │   │   │
│  │  │  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐   │   │   │
│  │  │  │Dialog │ │ Shell │ │ Store │ │Updater│   │   │   │
│  │  │  └───────┘ └───────┘ └───────┘ └───────┘   │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                      IPC 通信                               │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    后端 (Rust)                       │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │ Window  │ │  Tray   │ │ Process │               │   │
│  │  │ Manager │ │  Icon   │ │ Manager │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 技术 | 用途 |
|------|------|
| Tauri 2.x | 桌面应用框架 |
| Rust | 后端逻辑 |
| SolidJS | 前端 UI (通过 App 模块) |
| Vite | 前端构建 |

## 目录结构

```
packages/desktop/
├── src/                   # 前端源码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 入口文件
│   └── tauri.ts           # Tauri API 封装
├── src-tauri/             # Tauri/Rust 源码
│   ├── src/
│   │   ├── main.rs        # Rust 入口
│   │   └── lib.rs         # Rust 库
│   ├── Cargo.toml         # Rust 依赖
│   ├── tauri.conf.json    # Tauri 配置
│   └── capabilities/      # 权限配置
├── scripts/               # 构建脚本
├── vite.config.ts         # Vite 配置
└── package.json
```

## 开发

### 环境要求

- Bun 1.3+
- Rust 1.70+
- 平台特定依赖 (见 Tauri 文档)

### 启动开发模式

```bash
cd packages/desktop

# 预处理 (生成必要文件)
bun predev

# 启动开发
bun tauri dev
```

### 构建

```bash
# 类型检查
bun typecheck

# 构建应用
bun tauri build
```

## Tauri 插件

Desktop 使用以下 Tauri 插件：

| 插件 | 用途 |
|------|------|
| `@tauri-apps/plugin-dialog` | 原生对话框 |
| `@tauri-apps/plugin-shell` | Shell 命令执行 |
| `@tauri-apps/plugin-store` | 本地存储 |
| `@tauri-apps/plugin-updater` | 自动更新 |
| `@tauri-apps/plugin-notification` | 系统通知 |
| `@tauri-apps/plugin-os` | 系统信息 |
| `@tauri-apps/plugin-process` | 进程管理 |
| `@tauri-apps/plugin-http` | HTTP 请求 |
| `@tauri-apps/plugin-window-state` | 窗口状态保存 |
| `@tauri-apps/plugin-opener` | 打开文件/URL |

## 配置

### Tauri 配置

```json
// src-tauri/tauri.conf.json
{
  "productName": "OpenCode",
  "version": "1.0.0",
  "identifier": "ai.opencode.desktop",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "OpenCode",
        "width": 1200,
        "height": 800,
        "resizable": true
      }
    ]
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": ["icons/icon.png"]
  }
}
```

### 权限配置

```json
// src-tauri/capabilities/default.json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-spawn",
    "dialog:allow-open",
    "store:allow-get",
    "store:allow-set"
  ]
}
```

## 前端集成

Desktop 前端基于 App 模块：

```tsx
// src/App.tsx
import { App as OpenCodeApp } from "@opencode-ai/app"
import { TauriProvider } from "./tauri"

function App() {
  return (
    <TauriProvider>
      <OpenCodeApp />
    </TauriProvider>
  )
}

export default App
```

### Tauri API 封装

```typescript
// src/tauri.ts
import { invoke } from "@tauri-apps/api/core"
import { open } from "@tauri-apps/plugin-dialog"
import { Command } from "@tauri-apps/plugin-shell"

export async function selectDirectory() {
  return await open({
    directory: true,
    multiple: false
  })
}

export async function runCommand(cmd: string, args: string[]) {
  const command = Command.create(cmd, args)
  return await command.execute()
}
```

## 支持的平台

| 平台 | 架构 | 状态 |
|------|------|------|
| Windows | x64, arm64 | ✅ |
| macOS | x64, arm64 | ✅ |
| Linux | x64, arm64 | ✅ |

## 构建产物

构建后的应用位于 `src-tauri/target/release/bundle/`:

| 平台 | 格式 |
|------|------|
| Windows | `.msi`, `.exe` |
| macOS | `.dmg`, `.app` |
| Linux | `.deb`, `.rpm`, `.AppImage` |

## 自动更新

Desktop 支持自动更新：

```rust
// src-tauri/src/main.rs
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                update(handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 与其他模块的关系

### App 模块

Desktop 复用 App 模块的 UI 组件：

```typescript
import { SessionList, MessageView, Terminal } from "@opencode-ai/app"
```

### OpenCode Server

Desktop 内嵌 OpenCode Server：

```typescript
import { createOpencodeServer } from "@opencode-ai/sdk"

// 启动内嵌 Server
const server = await createOpencodeServer({
  port: 0  // 自动选择端口
})
```

## 下一步

- [Console 模块](./console.md) - 了解管理控制台
