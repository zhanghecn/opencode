# 数据流和消息流

## 用户输入到响应的完整流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SessionPrompt.prompt()                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 创建用户消息 (MessageV2.user)                                         ││
│  │ 2. 解析文件引用 (@file, @url)                                            ││
│  │ 3. 触发插件钩子 (Plugin.trigger("message:pre"))                          ││
│  │ 4. 保存消息到存储                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SessionPrompt.loop()                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ while (true) {                                                           ││
│  │   // 1. 获取消息历史                                                     ││
│  │   messages = await MessageV2.list(sessionID)                             ││
│  │                                                                          ││
│  │   // 2. 检查退出条件                                                     ││
│  │   if (shouldExit(messages)) break                                        ││
│  │                                                                          ││
│  │   // 3. 处理特殊任务 (compaction, plan mode)                             ││
│  │   await handleSpecialTasks()                                             ││
│  │                                                                          ││
│  │   // 4. 调用 LLM                                                         ││
│  │   response = await LLM.call(messages, tools, agent)                      ││
│  │                                                                          ││
│  │   // 5. 处理响应                                                         ││
│  │   await processResponse(response)                                        ││
│  │ }                                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LLM.call()                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 获取模型实例 (Provider.getLanguage)                                   ││
│  │ 2. 构建系统提示词 (System.build)                                         ││
│  │ 3. 转换消息格式 (MessageV2 -> AI SDK format)                             ││
│  │ 4. 调用 AI SDK (streamText)                                              ││
│  │ 5. 流式处理响应                                                          ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         工具调用处理                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ for (toolCall of response.toolCalls) {                                   ││
│  │   // 1. 查找工具                                                         ││
│  │   tool = ToolRegistry.get(toolCall.name)                                 ││
│  │                                                                          ││
│  │   // 2. 权限检查                                                         ││
│  │   await Permission.check(tool, args)                                     ││
│  │                                                                          ││
│  │   // 3. 执行工具                                                         ││
│  │   result = await tool.execute(args, context)                             ││
│  │                                                                          ││
│  │   // 4. 保存工具结果                                                     ││
│  │   await MessageV2.toolResult(sessionID, toolCall.id, result)             ││
│  │ }                                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
响应输出
```

## 消息数据结构

### MessageV2 核心结构

```typescript
// 文件: packages/opencode/src/session/message-v2.ts

// 消息类型
type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-invocation"; toolInvocation: ToolInvocation }
  | { type: "tool-result"; toolResult: ToolResult }
  | { type: "reasoning"; reasoning: string }
  | { type: "file"; file: FileAttachment }
  | { type: "image"; image: ImageAttachment }

// 消息结构
interface Message {
  id: string
  sessionID: string
  role: "user" | "assistant" | "system"
  parts: MessagePart[]
  metadata: {
    time: {
      created: number
      updated: number
    }
    model?: {
      providerID: string
      modelID: string
    }
    usage?: {
      input: number
      output: number
      reasoning?: number
      cache?: { read: number; write: number }
    }
  }
}
```

### 工具调用结构

```typescript
// 工具调用
interface ToolInvocation {
  id: string
  name: string
  args: Record<string, unknown>
  state: "pending" | "running" | "completed" | "failed"
}

// 工具结果
interface ToolResult {
  id: string
  name: string
  result: {
    title: string
    output: string
    metadata?: Record<string, unknown>
  }
}
```

## 事件流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              事件总线 (Bus)                                  │
│                                                                             │
│  发布者                          事件                          订阅者        │
│  ┌─────────┐                                                 ┌─────────┐   │
│  │ Session │ ──────► Session.Event.Start ──────────────────► │   TUI   │   │
│  │         │ ──────► Session.Event.Message ────────────────► │         │   │
│  │         │ ──────► Session.Event.ToolCall ───────────────► │  Plugin │   │
│  │         │ ──────► Session.Event.Complete ───────────────► │         │   │
│  │         │ ──────► Session.Event.Error ──────────────────► │   Log   │   │
│  └─────────┘                                                 └─────────┘   │
│                                                                             │
│  ┌─────────┐                                                 ┌─────────┐   │
│  │  Tool   │ ──────► Tool.Event.Start ─────────────────────► │   TUI   │   │
│  │         │ ──────► Tool.Event.Progress ──────────────────► │         │   │
│  │         │ ──────► Tool.Event.Complete ──────────────────► │  Plugin │   │
│  └─────────┘                                                 └─────────┘   │
│                                                                             │
│  ┌─────────┐                                                 ┌─────────┐   │
│  │   MCP   │ ──────► MCP.ToolsChanged ─────────────────────► │ Session │   │
│  │         │ ──────► MCP.BrowserOpenFailed ────────────────► │   TUI   │   │
│  └─────────┘                                                 └─────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 上下文压缩流程

```
消息历史超过阈值
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Compaction.run()                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 检查是否需要压缩                                                      ││
│  │    - 消息数量 > threshold                                                ││
│  │    - Token 数量 > context_limit * ratio                                  ││
│  │                                                                          ││
│  │ 2. 选择压缩策略                                                          ││
│  │    - summary: 生成摘要替换旧消息                                          ││
│  │    - truncate: 截断旧消息                                                ││
│  │                                                                          ││
│  │ 3. 执行压缩                                                              ││
│  │    - 调用 LLM 生成摘要                                                   ││
│  │    - 保留最近 N 条消息                                                   ││
│  │    - 更新消息存储                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
继续处理
```

## 子代理任务流程

```
主代理调用 Task 工具
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TaskTool.execute()                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 创建子会话                                                            ││
│  │    session = await Session.create({ parent: parentSession })             ││
│  │                                                                          ││
│  │ 2. 选择代理类型                                                          ││
│  │    agent = Agent.get(args.subagent_type)                                 ││
│  │                                                                          ││
│  │ 3. 执行子任务                                                            ││
│  │    result = await SessionPrompt.prompt(session, args.prompt, agent)      ││
│  │                                                                          ││
│  │ 4. 返回结果给主代理                                                      ││
│  │    return { output: result.summary }                                     ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
主代理继续处理
```

## 下一步

- [扩展点总览](./extension-points.md)
- [会话系统详解](../01-session-system/README.md)
