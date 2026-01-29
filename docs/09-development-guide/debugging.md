# 调试运行指南

本文档介绍如何调试和运行 OpenCode。

## CLI 开发模式

### 基本启动

```bash
# 从项目根目录启动
bun dev

# 等同于
bun run --cwd packages/opencode --conditions=browser src/index.ts
```

### 带参数启动

```bash
# 指定模型
bun dev -- --model anthropic/claude-sonnet-4-20250514

# 指定项目目录
bun dev -- --project /path/to/project

# 执行单次命令
bun dev -- -p "你好"

# 启动 Server 模式
bun dev -- serve
```

## VS Code 调试配置

创建 `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": [],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug Server",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": ["serve"],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    },
    {
      "name": "Debug with Prompt",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/packages/opencode/src/index.ts",
      "cwd": "${workspaceFolder}",
      "args": ["-p", "测试提示词"],
      "env": {
        "OPENCODE_LOG_LEVEL": "debug"
      }
    }
  ]
}
```

## 日志系统

### 日志级别

OpenCode 使用结构化日志系统，支持以下级别：

| 级别 | 说明 |
|------|------|
| `debug` | 详细调试信息 |
| `info` | 一般信息 |
| `warn` | 警告信息 |
| `error` | 错误信息 |

### 设置日志级别

```bash
# 环境变量方式
OPENCODE_LOG_LEVEL=debug bun dev

# 命令行参数
bun dev -- --log-level debug
```

### 日志文件位置

日志文件存储在用户状态目录：

- **Linux**: `~/.local/state/opencode/logs/`
- **macOS**: `~/Library/Application Support/opencode/logs/`
- **Windows**: `%APPDATA%\opencode\logs\`

## 断点调试

### 使用 VS Code

1. 在代码中设置断点
2. 选择调试配置
3. 按 F5 启动调试
4. 使用调试控制台查看变量

### 使用 Bun 内置调试器

```bash
# 启动调试模式
bun --inspect packages/opencode/src/index.ts

# 使用 Chrome DevTools 连接
# 打开 chrome://inspect
```

## 常见调试场景

### 调试工具执行

在 `packages/opencode/src/tool/` 目录下的工具文件中设置断点：

```typescript
// packages/opencode/src/tool/builtin/read.ts
execute: async (args) => {
  // 在这里设置断点
  const content = await fs.readFile(args.file_path, "utf-8")
  return content
}
```

### 调试会话流程

关键文件：
- `packages/opencode/src/session/session.ts` - 会话管理
- `packages/opencode/src/session/chat.ts` - 聊天处理
- `packages/opencode/src/session/message.ts` - 消息处理

### 调试 LLM 调用

关键文件：
- `packages/opencode/src/provider/provider.ts` - 提供商管理
- `packages/opencode/src/provider/model.ts` - 模型调用

## 性能分析

### 使用 Bun 内置分析器

```bash
# CPU 分析
bun --cpu-prof packages/opencode/src/index.ts

# 内存分析
bun --heap-prof packages/opencode/src/index.ts
```

### 分析 Server 性能

```bash
# 启动 Server 并记录性能
OPENCODE_LOG_LEVEL=debug bun dev -- serve

# 使用 curl 测试端点
curl http://localhost:4096/path
```

## 测试

### 运行单元测试

```bash
cd packages/opencode
bun test

# 运行特定测试文件
bun test src/tool/builtin/read.test.ts

# 监听模式
bun test --watch
```

### 运行 E2E 测试

```bash
cd packages/app
bun test:e2e

# 使用 UI 模式
bun test:e2e:ui
```

## 常见问题排查

### 工具执行失败

1. 检查工具参数是否正确
2. 查看日志中的错误信息
3. 确认权限配置

### LLM 调用超时

1. 检查网络连接
2. 确认 API Key 配置
3. 尝试降低 `maxTokens` 参数

### Server 启动失败

1. 检查端口是否被占用
2. 查看日志中的错误信息
3. 确认环境变量配置

## 下一步

- [Server 模式详解](./server-mode.md) - 了解 Server 模式的架构和使用
