# 会话生命周期

## 会话状态流转

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              会话生命周期                                    │
│                                                                             │
│  创建会话                                                                    │
│     │                                                                       │
│     ▼                                                                       │
│  ┌─────────┐                                                                │
│  │  idle   │◄─────────────────────────────────────────────────────┐        │
│  │  空闲   │                                                       │        │
│  └────┬────┘                                                       │        │
│       │                                                            │        │
│       │ prompt() / command()                                       │        │
│       ▼                                                            │        │
│  ┌─────────┐                                                       │        │
│  │  busy   │                                                       │        │
│  │  忙碌   │                                                       │        │
│  └────┬────┘                                                       │        │
│       │                                                            │        │
│       │ loop()                                                     │        │
│       ▼                                                            │        │
│  ┌─────────────────────────────────────────────────────────────┐  │        │
│  │                        处理循环                              │  │        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │  │        │
│  │  │ 获取消息 │─►│ 检查退出 │─►│ 调用LLM │─►│ 处理响应 │        │  │        │
│  │  └─────────┘  └────┬────┘  └─────────┘  └────┬────┘        │  │        │
│  │                    │                         │              │  │        │
│  │                    │ 退出条件满足             │ 继续循环     │  │        │
│  │                    ▼                         ▼              │  │        │
│  │               ┌─────────┐              ┌─────────┐          │  │        │
│  │               │  退出   │              │  继续   │──────────┘  │        │
│  │               └────┬────┘              └─────────┘             │        │
│  └────────────────────┼──────────────────────────────────────────┘        │
│                       │                                                    │
│                       │ cancel() / 完成                                    │
│                       ▼                                                    │
│                  ┌─────────┐                                               │
│                  │  idle   │                                               │
│                  │  空闲   │                                               │
│                  └─────────┘                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 会话创建

```typescript
// 文件: packages/opencode/src/session/index.ts

// 创建新会话
const session = await Session.create({
  title: "新会话",           // 可选，默认自动生成
  parentID: undefined,       // 可选，父会话 ID (用于子代理)
})

// 会话数据结构
interface Session.Info {
  id: string                 // 会话唯一标识
  title: string              // 会话标题
  parentID?: string          // 父会话 ID
  share?: boolean            // 是否共享
  revert?: RevertInfo        // 回滚信息
  permission?: Ruleset       // 权限规则
  time: {
    created: number          // 创建时间
    updated: number          // 更新时间
  }
}
```

## 会话操作

### 获取会话

```typescript
// 获取单个会话
const session = await Session.get(sessionID)

// 列出所有会话
const sessions = await Session.list()

// 获取最近会话
const recent = await Session.recent()
```

### 更新会话

```typescript
// 更新会话属性
await Session.update(sessionID, (draft) => {
  draft.title = "新标题"
})

// 触摸会话 (更新时间戳)
await Session.touch(sessionID)
```

### 删除会话

```typescript
// 删除单个会话
await Session.remove(sessionID)

// 清空所有会话
await Session.clear()
```

## 消息管理

### 添加消息

```typescript
// 更新/创建消息
await Session.updateMessage({
  id: messageID,
  sessionID: sessionID,
  role: "user",
  time: { created: Date.now() },
  // ... 其他字段
})

// 更新/创建消息部件
await Session.updatePart({
  id: partID,
  messageID: messageID,
  sessionID: sessionID,
  type: "text",
  text: "消息内容",
})
```

### 获取消息

```typescript
// 流式获取消息
for await (const message of MessageV2.stream(sessionID)) {
  console.log(message.info, message.parts)
}

// 过滤已压缩的消息
const messages = await MessageV2.filterCompacted(MessageV2.stream(sessionID))
```

## 退出条件

会话循环在以下情况下退出：

1. **正常完成**: 助手消息的 `finish` 字段不是 `tool-calls` 或 `unknown`
2. **用户取消**: 调用 `SessionPrompt.cancel(sessionID)`
3. **达到步数限制**: 超过代理配置的最大步数
4. **上下文溢出**: 需要进行上下文压缩

```typescript
// 检查退出条件
if (
  lastAssistant?.finish &&
  !["tool-calls", "unknown"].includes(lastAssistant.finish) &&
  lastUser.id < lastAssistant.id
) {
  // 退出循环
  break
}
```

## 会话状态管理

```typescript
// 文件: packages/opencode/src/session/status.ts

// 设置会话状态
SessionStatus.set(sessionID, { type: "idle" })
SessionStatus.set(sessionID, { type: "busy" })

// 获取会话状态
const status = SessionStatus.get(sessionID)
```

## 子会话 (子代理)

子会话用于 Task 工具创建的子代理任务：

```typescript
// 创建子会话
const childSession = await Session.create({
  parentID: parentSessionID,
})

// 子会话特点:
// - 继承父会话的部分配置
// - 独立的消息历史
// - 结果返回给父会话
```

## 下一步

- [消息处理流程](./message-processing.md)
- [LLM 交互机制](./llm-interaction.md)
