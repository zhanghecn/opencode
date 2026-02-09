# 自定义工具指南

## 工具文件位置

自定义工具可以放在以下位置：

```
.opencode/tool/my-tool.ts       # 项目级工具
.opencode/tools/my-tool.ts      # 项目级工具 (复数)
~/.opencode/tool/my-tool.ts     # 全局工具
~/.opencode/tools/my-tool.ts    # 全局工具 (复数)
```

## 基本工具模板

```typescript
// .opencode/tool/my-tool.ts
import z from "zod"

// 默认导出
export default {
  description: "我的自定义工具描述",
  args: {
    input: z.string().describe("输入参数"),
    count: z.number().optional().describe("可选的数量参数"),
  },
  async execute(args, ctx) {
    // args: { input: string, count?: number }
    // ctx: ToolContext

    // 工具逻辑
    const result = `处理: ${args.input}`

    return result // 返回字符串
  },
}
```

## 工具上下文 (ToolContext)

```typescript
interface ToolContext {
  directory: string // 项目目录
  worktree: string // Git 工作树根目录
  // ... 其他属性
}
```

## 完整示例

### 文件处理工具

```typescript
// .opencode/tool/file-stats.ts
import z from "zod"
import fs from "fs/promises"
import path from "path"

export default {
  description: "获取文件或目录的统计信息",
  args: {
    path: z.string().describe("文件或目录路径"),
    recursive: z.boolean().optional().describe("是否递归统计"),
  },
  async execute(args, ctx) {
    const targetPath = path.resolve(ctx.directory, args.path)
    const stats = await fs.stat(targetPath)

    if (stats.isFile()) {
      return JSON.stringify(
        {
          type: "file",
          size: stats.size,
          modified: stats.mtime.toISOString(),
        },
        null,
        2,
      )
    }

    if (stats.isDirectory()) {
      const files = await fs.readdir(targetPath)
      let totalSize = 0
      let fileCount = 0

      for (const file of files) {
        const filePath = path.join(targetPath, file)
        const fileStats = await fs.stat(filePath)
        if (fileStats.isFile()) {
          totalSize += fileStats.size
          fileCount++
        }
      }

      return JSON.stringify(
        {
          type: "directory",
          fileCount,
          totalSize,
        },
        null,
        2,
      )
    }

    return "Unknown file type"
  },
}
```

### API 调用工具

```typescript
// .opencode/tool/api-client.ts
import z from "zod"

export default {
  description: "调用外部 API",
  args: {
    endpoint: z.string().describe("API 端点"),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
    body: z.string().optional().describe("请求体 (JSON)"),
  },
  async execute(args, ctx) {
    const options: RequestInit = {
      method: args.method,
      headers: {
        "Content-Type": "application/json",
      },
    }

    if (args.body) {
      options.body = args.body
    }

    const response = await fetch(args.endpoint, options)
    const data = await response.json()

    return JSON.stringify(data, null, 2)
  },
}
```

### 数据库查询工具

```typescript
// .opencode/tool/db-query.ts
import z from "zod"

export default {
  description: "执行数据库查询 (只读)",
  args: {
    query: z.string().describe("SQL 查询语句"),
    database: z.string().optional().describe("数据库名称"),
  },
  async execute(args, ctx) {
    // 安全检查
    const query = args.query.trim().toLowerCase()
    if (!query.startsWith("select")) {
      return "Error: Only SELECT queries are allowed"
    }

    // 执行查询 (示例)
    // const db = await connectDatabase(args.database)
    // const results = await db.query(args.query)

    return "Query results would appear here"
  },
}
```

## 多工具导出

一个文件可以导出多个工具：

```typescript
// .opencode/tool/utils.ts
import z from "zod"

// 默认导出
export default {
  description: "默认工具",
  args: { input: z.string() },
  async execute(args, ctx) {
    return `Default: ${args.input}`
  },
}

// 命名导出 (工具 ID: utils_helper)
export const helper = {
  description: "辅助工具",
  args: { value: z.number() },
  async execute(args, ctx) {
    return `Helper: ${args.value * 2}`
  },
}

// 命名导出 (工具 ID: utils_formatter)
export const formatter = {
  description: "格式化工具",
  args: { text: z.string() },
  async execute(args, ctx) {
    return args.text.toUpperCase()
  },
}
```

## 工具加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         工具加载流程                                         │
│                                                                             │
│  1. 扫描工具目录                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ for (const dir of await Config.directories()) {                     ││
│     │   for await (const match of glob.scan("{tool,tools}/*.{js,ts}")) { ││
│     │     // 加载工具文件                                                  ││
│     │   }                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 导入工具模块                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const mod = await import(match)                                     ││
│     │ for (const [id, def] of Object.entries(mod)) {                      ││
│     │   // id: "default" -> 文件名                                         ││
│     │   // id: "helper" -> "文件名_helper"                                 ││
│     │   custom.push(fromPlugin(id, def))                                  ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 转换为内部格式                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ function fromPlugin(id, def) {                                      ││
│     │   return {                                                          ││
│     │     id,                                                             ││
│     │     init: async () => ({                                            ││
│     │       parameters: z.object(def.args),                               ││
│     │       description: def.description,                                 ││
│     │       execute: async (args, ctx) => {                               ││
│     │         const result = await def.execute(args, pluginCtx)           ││
│     │         return { title: "", output: result, metadata: {} }          ││
│     │       },                                                            ││
│     │     }),                                                             ││
│     │   }                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 最佳实践

### 1. 参数验证

```typescript
args: {
  // 使用 describe() 提供清晰的参数说明
  path: z.string().describe("文件路径，相对于项目根目录"),

  // 使用 optional() 标记可选参数
  format: z.enum(["json", "yaml"]).optional().describe("输出格式"),

  // 使用 default() 提供默认值
  limit: z.number().default(100).describe("最大结果数"),
}
```

### 2. 错误处理

```typescript
async execute(args, ctx) {
  try {
    const result = await riskyOperation(args)
    return JSON.stringify(result)
  } catch (error) {
    // 返回有意义的错误信息
    return `Error: ${error.message}\n\nPlease check the input and try again.`
  }
}
```

### 3. 输出格式

```typescript
async execute(args, ctx) {
  const data = await fetchData(args)

  // 结构化输出便于 LLM 理解
  return [
    `Found ${data.length} results:`,
    "",
    ...data.map((item, i) => `${i + 1}. ${item.name}: ${item.value}`),
  ].join("\n")
}
```

### 4. 安全考虑

```typescript
async execute(args, ctx) {
  // 验证路径在项目内
  const resolved = path.resolve(ctx.directory, args.path)
  if (!resolved.startsWith(ctx.directory)) {
    return "Error: Path must be within project directory"
  }

  // 继续处理...
}
```

## 下一步

- [代理系统详解](../03-agent-system/README.md)
- [插件系统详解](../05-plugin-system/README.md)
