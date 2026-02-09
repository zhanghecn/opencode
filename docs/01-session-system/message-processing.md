# 消息处理流程

## 完整处理流程

```
用户输入
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SessionPrompt.prompt(input)                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 获取会话: Session.get(sessionID)                                      ││
│  │ 2. 清理回滚: SessionRevert.cleanup(session)                              ││
│  │ 3. 创建用户消息: createUserMessage(input)                                ││
│  │    - 解析文件引用 (@file)                                                ││
│  │    - 解析代理引用 (@agent)                                               ││
│  │    - 触发插件钩子                                                        ││
│  │ 4. 更新会话时间: Session.touch(sessionID)                                ││
│  │ 5. 进入主循环: loop(sessionID)                                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SessionPrompt.loop(sessionID)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ while (true) {                                                           ││
│  │   // 1. 设置状态为忙碌                                                   ││
│  │   SessionStatus.set(sessionID, { type: "busy" })                         ││
│  │                                                                          ││
│  │   // 2. 获取消息历史                                                     ││
│  │   msgs = await MessageV2.filterCompacted(MessageV2.stream(sessionID))    ││
│  │                                                                          ││
│  │   // 3. 查找关键消息                                                     ││
│  │   lastUser = findLastUserMessage(msgs)                                   ││
│  │   lastAssistant = findLastAssistantMessage(msgs)                         ││
│  │   lastFinished = findLastFinishedMessage(msgs)                           ││
│  │                                                                          ││
│  │   // 4. 检查退出条件                                                     ││
│  │   if (shouldExit(lastAssistant, lastUser)) break                         ││
│  │                                                                          ││
│  │   // 5. 处理特殊任务 (子任务、压缩)                                      ││
│  │   if (pendingSubtask) { await handleSubtask(); continue }                ││
│  │   if (pendingCompaction) { await handleCompaction(); continue }          ││
│  │   if (needsCompaction) { await createCompaction(); continue }            ││
│  │                                                                          ││
│  │   // 6. 正常处理                                                         ││
│  │   await processor.process({ messages, tools, model, agent })             ││
│  │ }                                                                        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SessionProcessor.process()                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ 1. 调用 LLM                                                              ││
│  │    result = await LLM.stream({ messages, tools, model, agent })          ││
│  │                                                                          ││
│  │ 2. 流式处理响应                                                          ││
│  │    for await (const chunk of result.stream) {                            ││
│  │      // 处理文本                                                         ││
│  │      if (chunk.type === "text") handleText(chunk)                        ││
│  │      // 处理推理                                                         ││
│  │      if (chunk.type === "reasoning") handleReasoning(chunk)              ││
│  │      // 处理工具调用                                                     ││
│  │      if (chunk.type === "tool-call") handleToolCall(chunk)               ││
│  │    }                                                                     ││
│  │                                                                          ││
│  │ 3. 执行工具调用                                                          ││
│  │    for (const toolCall of toolCalls) {                                   ││
│  │      result = await executeTool(toolCall)                                ││
│  │      await saveToolResult(toolCall.id, result)                           ││
│  │    }                                                                     ││
│  │                                                                          ││
│  │ 4. 更新消息状态                                                          ││
│  │    await Session.updateMessage(assistantMessage)                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
响应完成
```

## 消息创建详解

### createUserMessage 流程

```typescript
// 文件: packages/opencode/src/session/prompt.ts

async function createUserMessage(input: PromptInput) {
  // 1. 获取代理配置
  const agent = await Agent.get(input.agent ?? defaultAgent)

  // 2. 创建消息信息
  const info: MessageV2.Info = {
    id: input.messageID ?? Identifier.ascending("message"),
    role: "user",
    sessionID: input.sessionID,
    time: { created: Date.now() },
    agent: agent.name,
    model: input.model ?? agent.model ?? lastModel,
  }

  // 3. 处理消息部件
  const parts = await Promise.all(
    input.parts.map(async (part) => {
      // 处理文件引用
      if (part.type === "file") {
        return await handleFilePart(part)
      }
      // 处理代理引用
      if (part.type === "agent") {
        return await handleAgentPart(part)
      }
      // 处理文本
      return handleTextPart(part)
    })
  )

  // 4. 触发插件钩子
  await Plugin.trigger("chat.message", { ... }, { message: info, parts })

  // 5. 保存消息
  await Session.updateMessage(info)
  for (const part of parts) {
    await Session.updatePart(part)
  }

  return { info, parts }
}
```

### 文件引用处理

```typescript
// 处理 @file 引用
if (part.type === "file" && url.protocol === "file:") {
  // 读取文件内容
  const result = await ReadTool.execute({ filePath: filepath })

  return [
    // 合成的工具调用说明
    {
      type: "text",
      text: `Called the Read tool with: ${JSON.stringify({ filePath })}`,
      synthetic: true,
    },
    // 文件内容
    {
      type: "text",
      text: result.output,
      synthetic: true,
    },
    // 原始文件部件
    { ...part, messageID: info.id, sessionID: input.sessionID },
  ]
}
```

### 代理引用处理

```typescript
// 处理 @agent 引用
if (part.type === "agent") {
  return [
    // 代理部件
    { ...part, messageID: info.id, sessionID: input.sessionID },
    // 合成的指令
    {
      type: "text",
      text: "Use the above message and context to generate a prompt and call the task tool with subagent: " + part.name,
      synthetic: true,
    },
  ]
}
```

## 工具解析

```typescript
// 文件: packages/opencode/src/session/prompt.ts

async function resolveTools(input: {
  agent: Agent.Info
  model: Provider.Model
  session: Session.Info
  processor: SessionProcessor.Info
  messages: MessageV2.WithParts[]
}) {
  const tools: Record<string, AITool> = {}

  // 1. 加载内置工具
  for (const item of await ToolRegistry.tools(model, agent)) {
    tools[item.id] = tool({
      id: item.id,
      description: item.description,
      inputSchema: jsonSchema(item.parameters),
      execute: async (args, options) => {
        // 触发前置钩子
        await Plugin.trigger("tool.execute.before", { ... }, { args })

        // 执行工具
        const result = await item.execute(args, context)

        // 触发后置钩子
        await Plugin.trigger("tool.execute.after", { ... }, result)

        return result
      },
    })
  }

  // 2. 加载 MCP 工具
  for (const [key, item] of Object.entries(await MCP.tools())) {
    tools[key] = item
  }

  return tools
}
```

## 提醒插入

在特定情况下，系统会插入提醒消息：

```typescript
// 文件: packages/opencode/src/session/prompt.ts

async function insertReminders(input: {
  messages: MessageV2.WithParts[]
  agent: Agent.Info
  session: Session.Info
}) {
  // 计划模式提醒
  if (agent.name === "plan") {
    userMessage.parts.push({
      type: "text",
      text: PROMPT_PLAN,
      synthetic: true,
    })
  }

  // 从计划模式切换到构建模式
  if (wasPlan && agent.name === "build") {
    userMessage.parts.push({
      type: "text",
      text: BUILD_SWITCH,
      synthetic: true,
    })
  }

  return messages
}
```

## 命令执行

```typescript
// 文件: packages/opencode/src/session/prompt.ts

export async function command(input: CommandInput) {
  // 1. 获取命令定义
  const command = await Command.get(input.command)

  // 2. 解析参数
  const args = parseArguments(input.arguments)

  // 3. 处理模板
  let template = command.template
    .replaceAll(placeholderRegex, (_, index) => args[index - 1] ?? "")
    .replaceAll("$ARGUMENTS", input.arguments)

  // 4. 执行 shell 命令 (如果有)
  const shell = ConfigMarkdown.shell(template)
  if (shell.length > 0) {
    const results = await Promise.all(shell.map(([, cmd]) => $`${cmd}`.text()))
    template = template.replace(bashRegex, () => results[index++])
  }

  // 5. 解析模板部件
  const templateParts = await resolvePromptParts(template)

  // 6. 触发插件钩子
  await Plugin.trigger("command.execute.before", { ... }, { parts })

  // 7. 执行提示
  return prompt({
    sessionID: input.sessionID,
    model: taskModel,
    agent: agentName,
    parts: templateParts,
  })
}
```

## 下一步
- [LLM 交互机制](./llm-interaction.md)
- [工具系统详解](../02-tool-system/README.md)
