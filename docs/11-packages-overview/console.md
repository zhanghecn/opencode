# Console 模块

Console 模块是 OpenCode 的管理控制台，用于用户管理、订阅计费和系统监控。

## 概述

```
┌─────────────────────────────────────────────────────────────┐
│                      Console 模块                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    app (前端)                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ 用户    │ │ 订阅    │ │ 使用量  │ │ 设置    │   │   │
│  │  │ 管理    │ │ 管理    │ │ 统计    │ │ 页面    │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    core (业务逻辑)                   │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ 用户    │ │ 订阅    │ │ 计费    │ │ 模型    │   │   │
│  │  │ 服务    │ │ 服务    │ │ 服务    │ │ 管理    │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌────────────┬───────────┴───────────┬────────────────┐   │
│  │  function  │       resource        │      mail      │   │
│  │  (云函数)  │      (资源定义)       │    (邮件)      │   │
│  └────────────┴───────────────────────┴────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 子模块

| 子模块 | 包名 | 说明 |
|--------|------|------|
| app | `@opencode-ai/console-app` | 前端应用 |
| core | `@opencode-ai/console-core` | 核心业务逻辑 |
| function | - | 云函数 |
| mail | `@opencode-ai/console-mail` | 邮件服务 |
| resource | `@opencode-ai/console-resource` | 资源定义 |

## 技术栈

| 技术 | 用途 |
|------|------|
| SolidStart | 全栈框架 |
| SolidJS | 前端 UI |
| Drizzle ORM | 数据库 ORM |
| Stripe | 支付集成 |
| OpenAuth | 认证服务 |
| Cloudflare | 部署平台 |

## 目录结构

```
packages/console/
├── app/                   # 前端应用
│   ├── src/
│   │   ├── routes/        # 页面路由
│   │   ├── components/    # UI 组件
│   │   ├── lib/           # 工具函数
│   │   └── app.tsx        # 应用入口
│   ├── script/            # 构建脚本
│   └── package.json
├── core/                  # 核心业务逻辑
│   ├── src/
│   │   ├── user/          # 用户服务
│   │   ├── subscription/  # 订阅服务
│   │   ├── billing/       # 计费服务
│   │   ├── model/         # 模型管理
│   │   └── db/            # 数据库
│   ├── script/            # 管理脚本
│   └── package.json
├── function/              # 云函数
│   └── src/
├── mail/                  # 邮件服务
│   └── src/
│       └── templates/     # 邮件模板
└── resource/              # 资源定义
    └── src/
```

## 开发

### 启动开发服务器

```bash
cd packages/console/app

# 本地开发
bun dev

# 使用远程 API
bun dev:remote
```

### 数据库操作

```bash
cd packages/console/core

# 运行数据库迁移
bun db

# 开发环境
bun db-dev

# 生产环境
bun db-prod
```

### 模型管理

```bash
cd packages/console/core

# 更新模型列表
bun update-models

# 推送到开发环境
bun promote-models-to-dev

# 推送到生产环境
bun promote-models-to-prod
```

## App 子模块

前端应用，提供用户界面。

### 主要功能

- 用户注册/登录
- 订阅管理
- 使用量统计
- API Key 管理
- 账单查看

### 路由结构

```
/                    # 首页/仪表板
/auth/login          # 登录
/auth/register       # 注册
/subscription        # 订阅管理
/usage               # 使用量统计
/settings            # 设置
/billing             # 账单
```

## Core 子模块

核心业务逻辑，包含所有后端服务。

### 用户服务

```typescript
// core/src/user/index.ts
export namespace User {
  export async function create(data: CreateUserInput) { ... }
  export async function get(id: string) { ... }
  export async function update(id: string, data: UpdateUserInput) { ... }
}
```

### 订阅服务

```typescript
// core/src/subscription/index.ts
export namespace Subscription {
  export async function create(userId: string, plan: Plan) { ... }
  export async function cancel(subscriptionId: string) { ... }
  export async function upgrade(subscriptionId: string, newPlan: Plan) { ... }
}
```

### 计费服务

```typescript
// core/src/billing/index.ts
export namespace Billing {
  export async function recordUsage(userId: string, usage: Usage) { ... }
  export async function getInvoices(userId: string) { ... }
}
```

## 数据库

使用 Drizzle ORM 和 PlanetScale (MySQL)：

```typescript
// core/src/db/schema.ts
import { mysqlTable, varchar, timestamp } from "drizzle-orm/mysql-core"

export const users = mysqlTable("users", {
  id: varchar("id", { length: 26 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
})

export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 26 }).primaryKey(),
  userId: varchar("user_id", { length: 26 }).notNull(),
  plan: varchar("plan", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull()
})
```

## Stripe 集成

支付和订阅管理：

```typescript
// core/src/stripe/index.ts
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(userId: string, priceId: string) {
  return stripe.checkout.sessions.create({
    customer: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${process.env.APP_URL}/subscription/success`,
    cancel_url: `${process.env.APP_URL}/subscription/cancel`
  })
}
```

## 邮件服务

使用 JSX Email 模板：

```tsx
// mail/src/templates/welcome.tsx
import { Html, Head, Body, Text } from "@jsx-email/components"

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html>
      <Head />
      <Body>
        <Text>Welcome to OpenCode, {name}!</Text>
      </Body>
    </Html>
  )
}
```

## 部署

Console 部署到 Cloudflare：

```bash
# 构建
cd packages/console/app
bun build

# 部署 (通过 SST)
sst deploy --stage production
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_AUTH_URL` | 认证服务 URL |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe 公钥 |
| `DATABASE_URL` | 数据库连接字符串 |
| `STRIPE_SECRET_KEY` | Stripe 密钥 |

## 下一步

- [开发环境搭建](../09-development-guide/README.md) - 了解如何搭建开发环境
