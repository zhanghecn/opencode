# LLM 交互机制

## LLM 调用流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LLM.stream() 调用流程                                │
│                                                                             │
│  输入参数                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ - messages: 消息历史                                                     ││
│  │ - tools: 可用工具                                                        ││
│  │ - model: 模型配置                                                        ││
│  │ - agent: 代理配置                                                        ││
│  │ - system: 系统提示词                                                     ││
│  │ - abort: 取消信号                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         1. 获取模型实例                                  ││
│  │  language = await Provider.getLanguage(model)                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         2. 构建请求参数                                  ││
│  │  - maxTokens: 最大输出 token                                            ││
│  │  - temperature: 温度参数                                                ││
│  │  - providerOptions: 提供商特定选项                                      ││
│  │  - experimental_transform: 消息转换                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         3. 调用 AI SDK                                   ││
│  │  result = streamText({                                                  ││
│  │    model: language,                                                     ││
│  │    messages: [...system, ...messages],                                  ││
│  │    tools: tools,                                                        ││
│  │    abortSignal: abort,                                                  ││
│  │    ...options                                                           ││
│  │  })                                                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         4. 流式处理响应                                  ││
│  │  for await (const chunk of result.fullStream) {                         ││
│  │    // 处理文本、推理、工具调用等                                         ││
│  │  }                                                                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 核心代码

```typescript
// 文件: packages/opencode/src/session/llm.ts

export namespace LLM {
  export async function stream(input: {
    messages: CoreMessage[]
    tools: Record<string, AITool>
    model: Provider.Model
    agent: Agent.Info
    user: MessageV2.User
    system: CoreMessage[]
    abort: AbortSignal
    sessionID: string
    retries?: number
    small?: boolean
  }) {
    // 1. 获取模型实例
    const language = await Provider.getLanguage(input.model)

    // 2. 构建请求选项
    const options = buildOptions(input)

    // 3. 调用 AI SDK
    const result = streamText({
      model: language,
      messages: [...input.system, ...input.messages],
      tools: input.tools,
      abortSignal: input.abort,
      maxRetries: input.retries ?? 0,
      ...options,
    })

    return result
  }
}
```

## 请求参数构建

```typescript
function buildOptions(input: StreamInput) {
  const options: Record<string, any> = {}

  // 最大输出 token
  options.maxTokens = input.model.limit.output

  // 温度参数 (如果模型支持)
  if (input.model.capabilities.temperature) {
    options.temperature = input.agent.temperature ?? 0
  }

  // 提供商特定选项
  options.providerOptions = buildProviderOptions(input.model)

  // 消息转换 (用于推理模型)
  if (input.model.capabilities.interleaved) {
    options.experimental_transform = buildTransform(input.model)
  }

  return options
}
```

## 提供商特定选项

```typescript
function buildProviderOptions(model: Provider.Model) {
  const options: Record<string, any> = {}

  // Anthropic 特定选项
  if (model.providerID === "anthropic") {
    options.anthropic = {
      thinking: { type: "enabled", budgetTokens: 10000 },
    }
  }

  // OpenAI 特定选项
  if (model.providerID === "openai") {
    options.openai = {
      reasoningEffort: "medium",
    }
  }

  // Google 特定选项
  if (model.providerID.includes("google")) {
    options.google = {
      thinkingConfig: { thinkingBudget: 8000 },
    }
  }

  return options
}
```

## 流式响应处理

```typescript
// 文件: packages/opencode/src/session/processor.ts

export namespace SessionProcessor {
  export function create(input: CreateInput) {
    return {
      async process(processInput: ProcessInput) {
        // 调用 LLM
        const result = await LLM.stream({
          messages: processInput.messages,
          tools: processInput.tools,
          model: processInput.model,
          agent: processInput.agent,
          // ...
        })

        // 流式处理响应
        for await (const chunk of result.fullStream) {
          switch (chunk.type) {
            case "text-delta":
              // 处理文本增量
              await handleTextDelta(chunk.textDelta)
              break

            case "reasoning":
              // 处理推理内容
              await handleReasoning(chunk.textDelta)
              break

            case "tool-call":
              // 处理工具调用
              await handleToolCall(chunk)
              break

            case "tool-result":
              // 处理工具结果
              await handleToolResult(chunk)
              break

            case "finish":
              // 处理完成
              await handleFinish(chunk)
              break

            case "error":
              // 处理错误
              await handleError(chunk)
              break
          }
        }

        return result
      },
    }
  }
}
```

## 工具调用处理

```typescript
async function handleToolCall(chunk: ToolCallChunk) {
  // 1. 创建工具部件
  const part: MessageV2.ToolPart = {
    id: Identifier.ascending("part"),
    messageID: assistantMessage.id,
    sessionID: sessionID,
    type: "tool",
    callID: chunk.toolCallId,
    tool: chunk.toolName,
    state: {
      status: "running",
      input: chunk.args,
      time: { start: Date.now() },
    },
  }
  await Session.updatePart(part)

  // 2. 执行工具
  const result = await tools[chunk.toolName].execute(chunk.args, context)

  // 3. 更新工具结果
  part.state = {
    status: "completed",
    input: chunk.args,
    output: result.output,
    title: result.title,
    metadata: result.metadata,
    time: { start: part.state.time.start, end: Date.now() },
  }
  await Session.updatePart(part)
}
```

## 错误处理和重试

```typescript
// 文件: packages/opencode/src/session/llm.ts

export async function stream(input: StreamInput) {
  const maxRetries = input.retries ?? 0
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await streamText({
        model: language,
        messages: input.messages,
        tools: input.tools,
        abortSignal: input.abort,
        // ...
      })
      return result
    } catch (error) {
      lastError = error as Error

      // 检查是否可重试
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error
      }

      // 等待后重试
      await delay(Math.pow(2, attempt) * 1000)
    }
  }

  throw lastError
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // 网络错误
    if (error.message.includes("network")) return true
    // 速率限制
    if (error.message.includes("rate limit")) return true
    // 服务器错误
    if (error.message.includes("500")) return true
  }
  return false
}
```

## 消息格式转换

```typescript
// 文件: packages/opencode/src/session/message-v2.ts

export namespace MessageV2 {
  // 转换为 AI SDK 消息格式
  export function toModelMessages(
    messages: WithParts[],
    model: Provider.Model
  ): CoreMessage[] {
    return messages.map((msg) => {
      if (msg.info.role === "user") {
        return {
          role: "user",
          content: partsToContent(msg.parts, model),
        }
      }

      if (msg.info.role === "assistant") {
        return {
          role: "assistant",
          content: partsToAssistantContent(msg.parts, model),
        }
      }

      return {
        role: "system",
        content: partsToContent(msg.parts, model),
      }
    })
  }

  function partsToContent(parts: Part[], model: Provider.Model) {
    return parts.map((part) => {
      if (part.type === "text") {
        return { type: "text", text: part.text }
      }
      if (part.type === "file" && part.mime?.startsWith("image/")) {
        return { type: "image", image: part.url }
      }
      // ... 其他类型
    })
  }
}
```

## 下一步
- [工具系统详解](../02-tool-system/README.md)
- [代理系统详解](../03-agent-system/README.md)
