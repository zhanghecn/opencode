# 代理类型详解

## 代理定义接口

```typescript
// 文件: packages/opencode/src/agent/agent.ts

export namespace Agent {
  export const Info = z.object({
    name: z.string(), // 代理名称
    description: z.string().optional(), // 代理描述
    mode: z.enum(["subagent", "primary", "all"]), // 运行模式
    native: z.boolean().optional(), // 是否内置代理
    hidden: z.boolean().optional(), // 是否隐藏
    topP: z.number().optional(), // Top-P 采样参数
    temperature: z.number().optional(), // 温度参数
    color: z.string().optional(), // UI 显示颜色
    permission: PermissionNext.Ruleset, // 权限规则集
    model: z
      .object({
        // 可选的指定模型
        modelID: z.string(),
        providerID: z.string(),
      })
      .optional(),
    prompt: z.string().optional(), // 系统提示词
    options: z.record(z.string(), z.any()), // 额外选项
    steps: z.number().int().positive().optional(), // 最大步数
  })
}
```

## 内置代理详解

### 1. Build 代理 (默认)

```typescript
build: {
  name: "build",
  description: "The default agent. Executes tools based on configured permissions.",
  mode: "primary",
  native: true,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      question: "allow",      // 允许提问
      plan_enter: "allow",    // 允许进入规划模式
    }),
    user,
  ),
}
```

**特点**:

- 默认主代理，用户直接交互
- 拥有完整的工具访问权限
- 可以进入规划模式
- 可以向用户提问

### 2. Plan 代理 (规划模式)

```typescript
plan: {
  name: "plan",
  description: "Plan mode. Disallows all edit tools.",
  mode: "primary",
  native: true,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      question: "allow",
      plan_exit: "allow",     // 允许退出规划模式
      edit: {
        "*": "deny",          // 禁止所有编辑
        [".opencode/plans/*.md"]: "allow",  // 只允许编辑计划文件
      },
    }),
    user,
  ),
}
```

**特点**:

- 只读模式，禁止编辑代码
- 只能编辑计划文件 (.md)
- 用于任务规划和设计

### 3. General 代理 (通用子代理)

```typescript
general: {
  name: "general",
  description: "General-purpose agent for researching complex questions...",
  mode: "subagent",
  native: true,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      todoread: "deny",       // 禁止读取任务列表
      todowrite: "deny",      // 禁止写入任务列表
    }),
    user,
  ),
}
```

**特点**:

- 通用子代理，被主代理调用
- 用于执行复杂的多步骤任务
- 不能操作任务列表 (避免干扰主代理)

### 4. Explore 代理 (探索专家)

```typescript
explore: {
  name: "explore",
  description: "Fast agent specialized for exploring codebases...",
  mode: "subagent",
  native: true,
  prompt: PROMPT_EXPLORE,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      "*": "deny",            // 默认禁止所有
      grep: "allow",          // 允许搜索
      glob: "allow",          // 允许文件匹配
      list: "allow",          // 允许列目录
      bash: "allow",          // 允许 bash
      webfetch: "allow",      // 允许网页获取
      websearch: "allow",     // 允许网页搜索
      codesearch: "allow",    // 允许代码搜索
      read: "allow",          // 允许读取文件
    }),
    user,
  ),
}
```

**特点**:

- 专门用于代码探索
- 只有只读权限
- 有专门的系统提示词
- 支持不同的探索深度级别

**Explore 代理提示词**:

```
You are a file search specialist. You excel at thoroughly navigating
and exploring codebases.

Your strengths:
- Rapidly finding files using glob patterns
- Searching code and text with powerful regex patterns
- Reading and analyzing file contents

Guidelines:
- Use Glob for broad file pattern matching
- Use Grep for searching file contents with regex
- Use Read when you know the specific file path
- Adapt your search approach based on the thoroughness level
- Return file paths as absolute paths
- Do not create any files or modify the system
```

### 5. Compaction 代理 (上下文压缩)

```typescript
compaction: {
  name: "compaction",
  mode: "primary",
  native: true,
  hidden: true,              // 隐藏，用户不可见
  prompt: PROMPT_COMPACTION,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      "*": "deny",            // 禁止所有工具
    }),
    user,
  ),
}
```

**特点**:

- 隐藏代理，系统内部使用
- 用于压缩长对话上下文
- 没有工具访问权限

### 6. Title 代理 (标题生成)

```typescript
title: {
  name: "title",
  mode: "primary",
  native: true,
  hidden: true,
  temperature: 0.5,          // 较高温度，增加创造性
  prompt: PROMPT_TITLE,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      "*": "deny",
    }),
    user,
  ),
}
```

**特点**:

- 隐藏代理，自动生成会话标题
- 使用较高温度增加多样性
- 没有工具访问权限

### 7. Summary 代理 (摘要生成)

```typescript
summary: {
  name: "summary",
  mode: "primary",
  native: true,
  hidden: true,
  prompt: PROMPT_SUMMARY,
  permission: PermissionNext.merge(
    defaults,
    PermissionNext.fromConfig({
      "*": "deny",
    }),
    user,
  ),
}
```

**特点**:

- 隐藏代理，生成会话摘要
- 用于上下文压缩后的摘要
- 没有工具访问权限

## 代理权限系统

### 默认权限配置

```typescript
const defaults = PermissionNext.fromConfig({
  "*": "allow", // 默认允许所有
  doom_loop: "ask", // 循环检测需要确认
  external_directory: {
    "*": "ask", // 外部目录需要确认
    [Truncate.DIR]: "allow", // 截断目录允许
  },
  question: "deny", // 默认禁止提问
  plan_enter: "deny", // 默认禁止进入规划
  plan_exit: "deny", // 默认禁止退出规划
  read: {
    "*": "allow", // 允许读取所有文件
    "*.env": "ask", // .env 文件需要确认
    "*.env.*": "ask", // .env.* 文件需要确认
    "*.env.example": "allow", // .env.example 允许
  },
})
```

### 权限动作

| 动作    | 说明         |
| ------- | ------------ |
| `allow` | 自动允许     |
| `deny`  | 自动拒绝     |
| `ask`   | 需要用户确认 |

### 权限合并

```typescript
// 权限按优先级合并: defaults < user < agent-specific
permission: PermissionNext.merge(
  defaults, // 系统默认
  user, // 用户配置
  agentConfig, // 代理特定配置
)
```

## 代理选择流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         代理选择流程                                         │
│                                                                             │
│  1. 获取默认代理                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ async function defaultAgent() {                                     ││
│     │   const cfg = await Config.get()                                    ││
│     │   if (cfg.default_agent) {                                          ││
│     │     // 使用配置的默认代理                                             ││
│     │     return agents[cfg.default_agent]                                ││
│     │   }                                                                 ││
│     │   // 查找第一个可见的主代理                                           ││
│     │   return Object.values(agents).find(                                ││
│     │     a => a.mode !== "subagent" && a.hidden !== true                 ││
│     │   )                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 列出可用代理                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ async function list() {                                             ││
│     │   return pipe(                                                      ││
│     │     await state(),                                                  ││
│     │     values(),                                                       ││
│     │     sortBy([                                                        ││
│     │       (x) => x.name === cfg.default_agent,  // 默认代理排前面        ││
│     │       "desc"                                                        ││
│     │     ]),                                                             ││
│     │   )                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 下一步

- [自定义代理指南](./custom-agent-guide.md)
- [多代理协作模式](./multi-agent-patterns.md)
