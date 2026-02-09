# 开发环境搭建

本文档介绍如何搭建 OpenCode 的开发环境。

## 环境要求

### 必需依赖

| 依赖    | 版本要求 | 说明                 |
| ------- | -------- | -------------------- |
| Bun     | 1.3+     | 主要运行时和包管理器 |
| Node.js | 22+      | 部分工具链依赖       |
| Git     | 2.x      | 版本控制             |

### 可选依赖

| 依赖 | 版本要求 | 说明                 |
| ---- | -------- | -------------------- |
| Rust | 1.70+    | Desktop 模块构建需要 |
| pnpm | 8+       | 备选包管理器         |

## 项目克隆

```bash
# 克隆仓库
git clone https://github.com/anomalyco/opencode.git
cd opencode

# 安装依赖
bun install
```

## 项目结构

```
opencode/
├── packages/
│   ├── opencode/          # 核心 CLI 包
│   ├── app/               # 共享 Web UI 组件
│   ├── web/               # 官方网站
│   ├── desktop/           # 桌面应用 (Tauri)
│   ├── sdk/               # SDK 包
│   │   └── js/            # JavaScript SDK
│   ├── console/           # 管理控制台
│   │   ├── app/           # 控制台前端
│   │   ├── core/          # 控制台核心逻辑
│   │   ├── function/      # 云函数
│   │   ├── mail/          # 邮件服务
│   │   └── resource/      # 资源定义
│   ├── ui/                # UI 组件库
│   ├── util/              # 工具函数
│   └── plugin/            # 插件系统
├── docs/                  # 文档
└── patches/               # 依赖补丁
```

## 开发命令

### CLI 开发

```bash
# 启动 CLI 开发模式
bun dev

# 运行类型检查
bun typecheck

# 运行测试
cd packages/opencode && bun test
```

### Web UI 开发

```bash
# 启动 App 开发服务器
cd packages/app && bun dev

# 启动官网开发服务器
cd packages/web && bun dev
```

### Desktop 开发

```bash
# 启动桌面应用开发
cd packages/desktop && bun tauri dev
```

## 开发工具推荐

### IDE

- **VS Code** (推荐)
  - 安装 Bun 扩展
  - 安装 TypeScript 扩展
  - 安装 ESLint 扩展

- **WebStorm / IntelliJ IDEA**
  - 内置 TypeScript 支持
  - 配置 Bun 作为包管理器

### VS Code 配置

创建 `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 环境变量

开发时可能需要配置以下环境变量：

| 变量                       | 说明              | 示例                             |
| -------------------------- | ----------------- | -------------------------------- |
| `OPENCODE_LOG_LEVEL`       | 日志级别          | `debug`, `info`, `warn`, `error` |
| `OPENCODE_SERVER_PASSWORD` | Server 模式密码   | 任意字符串                       |
| `OPENCODE_SERVER_USERNAME` | Server 模式用户名 | 默认 `opencode`                  |

## 常见问题

### 依赖安装失败

```bash
# 清理缓存重新安装
rm -rf node_modules bun.lockb
bun install
```

### TypeScript 类型错误

```bash
# 重新生成类型
bun typecheck
```

### 端口被占用

Server 模式默认使用 4096 端口，如被占用会自动尝试其他端口。

## 下一步

- [调试运行指南](./debugging.md) - 了解如何调试 OpenCode
- [Server 模式详解](./server-mode.md) - 了解 Server 模式的使用
- [Serve 路由工作流](./serve-route-flow.md) - 从命令入口到 API/页面返回的完整链路
- [Bun.serve 从零理解](./bun-serve-from-zero.md) - 用 Request/Response 视角理解 fetch 绑定
- [Hono 从零理解](./hono-from-zero.md) - 中间件、路由、Context 与执行顺序
- [OpenCode 请求生命周期](./opencode-serve-request-lifecycle.md) - 从 CLI 到 API/页面响应的完整执行路径
- [运行入口文件索引](./entrypoints.md) - 快速定位调试入口
