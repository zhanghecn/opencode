# Web 模块

Web 模块 (`@opencode-ai/web`) 是 OpenCode 的官方网站，包含文档和产品介绍。

## 概述

```
┌─────────────────────────────────────────────────────────────┐
│                        Web 模块                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    页面                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │  首页   │ │  文档   │ │  博客   │ │  定价   │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    组件                              │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐               │   │
│  │  │ Header  │ │ Footer  │ │ Sidebar │               │   │
│  │  └─────────┘ └─────────┘ └─────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    内容                              │   │
│  │  ┌─────────┐ ┌─────────┐                           │   │
│  │  │Markdown │ │  MDX    │                           │   │
│  │  │  文档   │ │  组件   │                           │   │
│  │  └─────────┘ └─────────┘                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 技术      | 用途           |
| --------- | -------------- |
| Astro     | 静态站点生成器 |
| Starlight | 文档主题       |
| SolidJS   | 交互组件       |
| Shiki     | 代码高亮       |
| Marked    | Markdown 渲染  |

## 目录结构

```
packages/web/
├── src/
│   ├── pages/             # 页面
│   │   ├── index.astro    # 首页
│   │   ├── docs/          # 文档页面
│   │   └── blog/          # 博客页面
│   ├── components/        # 组件
│   ├── layouts/           # 布局
│   ├── content/           # 内容 (Markdown)
│   │   ├── docs/          # 文档内容
│   │   └── blog/          # 博客内容
│   └── styles/            # 样式
├── public/                # 静态资源
├── astro.config.mjs       # Astro 配置
└── package.json
```

## 开发

### 启动开发服务器

```bash
cd packages/web
bun dev
```

默认在 `http://localhost:4321` 启动。

### 使用远程 API

```bash
bun dev:remote
```

这会设置 `VITE_API_URL=https://api.opencode.ai`。

### 构建

```bash
bun build
```

### 预览构建结果

```bash
bun preview
```

## 页面结构

### 首页

```astro
---
// src/pages/index.astro
import Layout from "../layouts/Layout.astro"
import Hero from "../components/Hero.astro"
import Features from "../components/Features.astro"
---

<Layout title="OpenCode">
  <Hero />
  <Features />
</Layout>
```

### 文档页面

文档使用 Starlight 主题，支持：

- 自动生成侧边栏
- 搜索功能
- 多语言支持
- 版本管理

```astro
---
// src/content/docs/getting-started.md
title: Getting Started
description: Quick start guide for OpenCode
---

# Getting Started

...
```

## 配置

### Astro 配置

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import solidJs from "@astrojs/solid-js"
import cloudflare from "@astrojs/cloudflare"

export default defineConfig({
  integrations: [
    starlight({
      title: "OpenCode",
      social: {
        github: "https://github.com/anomalyco/opencode",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Installation", link: "/docs/installation" },
            { label: "Quick Start", link: "/docs/quick-start" },
          ],
        },
      ],
    }),
    solidJs(),
  ],
  output: "server",
  adapter: cloudflare(),
})
```

### 环境变量

| 变量           | 说明           | 默认值         |
| -------------- | -------------- | -------------- |
| `VITE_API_URL` | API 服务器地址 | 本地开发时为空 |

## 部署

Web 模块部署到 Cloudflare Pages：

```bash
# 构建
bun build

# 部署 (通过 CI/CD)
# 产物在 .output/ 目录
```

## 内容管理

### 添加文档

1. 在 `src/content/docs/` 创建 Markdown 文件
2. 添加 frontmatter 元数据
3. 更新 `astro.config.mjs` 中的侧边栏配置

```markdown
---
title: My New Doc
description: Description of the document
---

# My New Doc

Content here...
```

### 添加博客文章

1. 在 `src/content/blog/` 创建 Markdown 文件
2. 添加 frontmatter 元数据

```markdown
---
title: New Feature Release
date: 2024-01-15
author: OpenCode Team
---

# New Feature Release

Content here...
```

## 与其他模块的关系

### App 模块

Web 可以嵌入 App 组件用于交互式演示：

```astro
---
import { App } from "@opencode-ai/app"
---

<App client:only="solid-js" />
```

### OpenCode CLI

Web 使用 OpenCode CLI 生成配置 schema：

```bash
# 生成 config.json schema
../../opencode/script/schema.ts ./.output/public/config.json
```

## 下一步

- [Desktop 模块](./desktop.md) - 了解桌面应用
- [Console 模块](./console.md) - 了解管理控制台
