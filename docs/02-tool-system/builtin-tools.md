# 内置工具分析

## Bash 工具

**文件**: `packages/opencode/src/tool/bash.ts`

### 功能
执行 shell 命令，支持超时、取消和实时输出。

### 参数
```typescript
{
  command: string      // 要执行的命令
  timeout?: number     // 超时时间 (毫秒)
  workdir?: string     // 工作目录
  description: string  // 命令描述
}
```

### 特性
- 使用 tree-sitter 解析命令，提取权限模式
- 支持命令超时和用户取消
- 实时流式输出
- 自动检测外部目录访问

### 权限检查
```typescript
// 解析命令中的文件操作
for (const node of tree.rootNode.descendantsOfType("command")) {
  if (["cd", "rm", "cp", "mv", "mkdir", "touch"].includes(command[0])) {
    // 检查是否访问项目外的目录
    if (!Instance.containsPath(resolved)) {
      directories.add(resolved)
    }
  }
}

// 请求权限
await ctx.ask({
  permission: "bash",
  patterns: Array.from(patterns),
  always: Array.from(always),
  metadata: {},
})
```

---

## Read 工具

**文件**: `packages/opencode/src/tool/read.ts`

### 功能
读取文件内容，支持行范围、图片、PDF 等。

### 参数
```typescript
{
  file_path: string    // 文件路径
  offset?: number      // 起始行号
  limit?: number       // 读取行数
}
```

### 特性
- 支持文本文件、图片、PDF、Jupyter Notebook
- 自动检测文件类型
- 支持行号范围读取
- 输出带行号格式

---

## Write 工具

**文件**: `packages/opencode/src/tool/write.ts`

### 功能
创建或覆盖文件。

### 参数
```typescript
{
  file_path: string    // 文件路径
  content: string      // 文件内容
}
```

### 特性
- 自动创建父目录
- 权限检查
- 文件备份 (用于回滚)

---

## Edit 工具

**文件**: `packages/opencode/src/tool/edit.ts`

### 功能
编辑文件内容，支持精确替换。

### 参数
```typescript
{
  file_path: string    // 文件路径
  old_string: string   // 要替换的内容
  new_string: string   // 新内容
  replace_all?: boolean // 是否替换所有匹配
}
```

### 特性
- 精确字符串匹配
- 支持全局替换
- 唯一性检查 (避免歧义)
- 文件备份

---

## Glob 工具

**文件**: `packages/opencode/src/tool/glob.ts`

### 功能
按模式搜索文件。

### 参数
```typescript
{
  pattern: string      // glob 模式
  path?: string        // 搜索目录
}
```

### 特性
- 支持标准 glob 语法
- 按修改时间排序
- 自动忽略 .gitignore 文件

---

## Grep 工具

**文件**: `packages/opencode/src/tool/grep.ts`

### 功能
搜索文件内容。

### 参数
```typescript
{
  pattern: string      // 正则表达式
  path?: string        // 搜索目录
  include?: string     // 文件过滤
  context?: number     // 上下文行数
}
```

### 特性
- 基于 ripgrep
- 支持正则表达式
- 支持上下文行
- 支持文件类型过滤

---

## Task 工具

**文件**: `packages/opencode/src/tool/task.ts`

### 功能
启动子代理执行任务。

### 参数
```typescript
{
  prompt: string           // 任务提示
  description: string      // 任务描述
  subagent_type: string    // 代理类型
  model?: string           // 可选模型
  run_in_background?: boolean  // 后台运行
}
```

### 特性
- 创建子会话
- 支持多种代理类型
- 支持后台执行
- 结果汇总返回

### 代理类型
```typescript
const SUBAGENT_TYPES = [
  "Bash",           // 命令执行
  "general-purpose", // 通用任务
  "Explore",        // 代码探索
  "Plan",           // 任务规划
  // ... 自定义代理
]
```

---

## Skill 工具

**文件**: `packages/opencode/src/tool/skill.ts`

### 功能
调用技能。

### 参数
```typescript
{
  skill: string        // 技能名称
  args?: string        // 可选参数
}
```

### 特性
- 加载技能内容
- 支持参数传递
- 返回技能指令

---

## WebFetch 工具

**文件**: `packages/opencode/src/tool/webfetch.ts`

### 功能
获取网页内容。

### 参数
```typescript
{
  url: string          // 网页 URL
  prompt: string       // 处理提示
}
```

### 特性
- HTML 转 Markdown
- 使用小模型处理内容
- 支持重定向

---

## WebSearch 工具

**文件**: `packages/opencode/src/tool/websearch.ts`

### 功能
搜索网页。

### 参数
```typescript
{
  query: string        // 搜索查询
}
```

### 特性
- 集成搜索 API
- 返回结构化结果

---

## Question 工具

**文件**: `packages/opencode/src/tool/question.ts`

### 功能
向用户提问。

### 参数
```typescript
{
  questions: Array<{
    question: string
    header: string
    options: Array<{
      label: string
      description: string
    }>
    multiSelect?: boolean
  }>
}
```

### 特性
- 支持多选
- 支持自定义选项
- 等待用户响应

---

## TodoWrite/TodoRead 工具

**文件**: `packages/opencode/src/tool/todo.ts`

### 功能
管理任务列表。

### TodoWrite 参数
```typescript
{
  todos: Array<{
    content: string
    status: "pending" | "in_progress" | "completed"
    activeForm: string
  }>
}
```

### 特性
- 任务状态跟踪
- 持久化存储
- UI 显示

## 下一步
- [自定义工具指南](./custom-tool-guide.md)
- [代理系统详解](../03-agent-system/README.md)
