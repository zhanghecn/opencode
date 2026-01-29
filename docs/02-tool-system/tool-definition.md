# 工具定义接口

## 工具接口结构

```typescript
// 文件: packages/opencode/src/tool/tool.ts

export namespace Tool {
  // 工具元数据类型
  interface Metadata {
    [key: string]: any
  }

  // 初始化上下文
  export interface InitContext {
    agent?: Agent.Info  // 当前代理信息
  }

  // 执行上下文
  export type Context<M extends Metadata = Metadata> = {
    sessionID: string           // 会话 ID
    messageID: string           // 消息 ID
    agent: string               // 代理名称
    abort: AbortSignal          // 取消信号
    callID?: string             // 工具调用 ID
    extra?: { [key: string]: any }  // 额外数据
    messages: MessageV2.WithParts[] // 消息历史
    metadata(input: { title?: string; metadata?: M }): void  // 更新元数据
    ask(input: PermissionRequest): Promise<void>  // 请求权限
  }

  // 工具信息接口
  export interface Info<
    Parameters extends z.ZodType = z.ZodType,
    M extends Metadata = Metadata
  > {
    id: string  // 工具唯一标识
    init: (ctx?: InitContext) => Promise<{
      description: string       // 工具描述
      parameters: Parameters    // 参数 schema
      execute(
        args: z.infer<Parameters>,
        ctx: Context
      ): Promise<{
        title: string           // 结果标题
        metadata: M             // 结果元数据
        output: string          // 输出内容
        attachments?: MessageV2.FilePart[]  // 附件
      }>
      formatValidationError?(error: z.ZodError): string  // 自定义错误格式
    }>
  }
}
```

## 工具定义辅助函数

```typescript
// 使用 Tool.define() 定义工具
export function define<Parameters extends z.ZodType, Result extends Metadata>(
  id: string,
  init: Info<Parameters, Result>["init"] | Awaited<ReturnType<Info<Parameters, Result>["init"]>>
): Info<Parameters, Result> {
  return {
    id,
    init: async (initCtx) => {
      // 获取工具信息
      const toolInfo = init instanceof Function ? await init(initCtx) : init

      // 包装 execute 函数
      const execute = toolInfo.execute
      toolInfo.execute = async (args, ctx) => {
        // 1. 参数验证
        try {
          toolInfo.parameters.parse(args)
        } catch (error) {
          if (error instanceof z.ZodError && toolInfo.formatValidationError) {
            throw new Error(toolInfo.formatValidationError(error), { cause: error })
          }
          throw new Error(
            `The ${id} tool was called with invalid arguments: ${error}`,
            { cause: error }
          )
        }

        // 2. 执行工具
        const result = await execute(args, ctx)

        // 3. 输出截断 (如果工具未自行处理)
        if (result.metadata.truncated !== undefined) {
          return result
        }
        const truncated = await Truncate.output(result.output, {}, initCtx?.agent)
        return {
          ...result,
          output: truncated.content,
          metadata: {
            ...result.metadata,
            truncated: truncated.truncated,
            ...(truncated.truncated && { outputPath: truncated.outputPath }),
          },
        }
      }
      return toolInfo
    },
  }
}
```

## 工具定义示例

### 简单工具

```typescript
import { Tool } from "./tool"
import z from "zod"

export const MyTool = Tool.define("my-tool", {
  description: "这是一个示例工具",
  parameters: z.object({
    input: z.string().describe("输入参数"),
  }),
  async execute(args, ctx) {
    // 工具逻辑
    const result = `处理结果: ${args.input}`

    return {
      title: "处理完成",
      metadata: {},
      output: result,
    }
  },
})
```

### 带初始化的工具

```typescript
export const AsyncTool = Tool.define("async-tool", async (initCtx) => {
  // 初始化逻辑 (只执行一次)
  const config = await loadConfig()

  return {
    description: `工具描述 (配置: ${config.name})`,
    parameters: z.object({
      query: z.string(),
    }),
    async execute(args, ctx) {
      // 使用初始化时加载的配置
      const result = await processQuery(args.query, config)
      return {
        title: "查询完成",
        metadata: { config: config.name },
        output: result,
      }
    },
  }
})
```

### 带权限请求的工具

```typescript
export const PermissionTool = Tool.define("permission-tool", {
  description: "需要权限的工具",
  parameters: z.object({
    path: z.string().describe("文件路径"),
  }),
  async execute(args, ctx) {
    // 请求权限
    await ctx.ask({
      permission: "file_write",
      patterns: [args.path],
      always: [`${path.dirname(args.path)}/*`],
      metadata: {},
    })

    // 执行操作
    await writeFile(args.path, "content")

    return {
      title: "写入完成",
      metadata: { path: args.path },
      output: `文件已写入: ${args.path}`,
    }
  },
})
```

### 带进度更新的工具

```typescript
export const ProgressTool = Tool.define("progress-tool", {
  description: "带进度更新的工具",
  parameters: z.object({
    items: z.array(z.string()),
  }),
  async execute(args, ctx) {
    const results: string[] = []

    for (let i = 0; i < args.items.length; i++) {
      // 更新进度
      ctx.metadata({
        title: `处理中 (${i + 1}/${args.items.length})`,
        metadata: {
          progress: (i + 1) / args.items.length,
          current: args.items[i],
        },
      })

      // 处理项目
      const result = await processItem(args.items[i])
      results.push(result)
    }

    return {
      title: "处理完成",
      metadata: { count: results.length },
      output: results.join("\n"),
    }
  },
})
```

## 参数 Schema 定义

使用 Zod 定义参数 schema：

```typescript
import z from "zod"

const parameters = z.object({
  // 必需字符串
  name: z.string().describe("名称"),

  // 可选字符串
  description: z.string().optional().describe("描述"),

  // 带默认值
  count: z.number().default(10).describe("数量"),

  // 枚举
  type: z.enum(["a", "b", "c"]).describe("类型"),

  // 数组
  items: z.array(z.string()).describe("项目列表"),

  // 嵌套对象
  config: z.object({
    enabled: z.boolean(),
    value: z.number(),
  }).optional(),
})
```

## 工具结果结构

```typescript
interface ToolResult {
  title: string           // 显示在 UI 中的标题
  metadata: {             // 元数据 (显示在 UI 中)
    [key: string]: any
  }
  output: string          // 返回给 LLM 的输出
  attachments?: FilePart[] // 可选的文件附件
}
```

## 下一步
- [内置工具分析](./builtin-tools.md)
- [自定义工具指南](./custom-tool-guide.md)
