# 自定义代理指南

## 代理配置位置

自定义代理可以通过以下方式配置：

```
opencode.json                    # 项目配置文件
~/.opencode/opencode.json        # 全局配置文件
.opencode/agent/my-agent.ts      # 项目级代理文件
~/.opencode/agent/my-agent.ts    # 全局代理文件
```

## 配置文件方式

### 基本配置

```json
// opencode.json
{
  "agent": {
    "my-agent": {
      "name": "My Custom Agent",
      "description": "A custom agent for specific tasks",
      "mode": "primary",
      "prompt": "You are a specialized assistant for...",
      "temperature": 0.7
    }
  }
}
```

### 完整配置选项

```json
{
  "agent": {
    "code-reviewer": {
      "name": "Code Reviewer",
      "description": "专门用于代码审查的代理",
      "mode": "subagent",
      "prompt": "You are an expert code reviewer...",
      "temperature": 0.3,
      "top_p": 0.9,
      "model": "anthropic/claude-sonnet-4-20250514",
      "color": "#4CAF50",
      "hidden": false,
      "steps": 50,
      "permission": {
        "edit": "deny",
        "write": "deny",
        "bash": "deny"
      },
      "options": {
        "focus": "security"
      }
    }
  }
}
```

### 配置字段说明

| 字段          | 类型    | 说明                       |
| ------------- | ------- | -------------------------- |
| `name`        | string  | 显示名称                   |
| `description` | string  | 代理描述，用于 LLM 选择    |
| `mode`        | string  | `primary`/`subagent`/`all` |
| `prompt`      | string  | 系统提示词                 |
| `temperature` | number  | 温度参数 (0-1)             |
| `top_p`       | number  | Top-P 采样参数             |
| `model`       | string  | 指定模型 (provider/model)  |
| `color`       | string  | UI 显示颜色                |
| `hidden`      | boolean | 是否隐藏                   |
| `steps`       | number  | 最大执行步数               |
| `permission`  | object  | 权限配置                   |
| `options`     | object  | 额外选项                   |
| `disable`     | boolean | 禁用此代理                 |

## 修改内置代理

### 修改 Build 代理权限

```json
{
  "agent": {
    "build": {
      "permission": {
        "bash": "ask",
        "write": "ask"
      }
    }
  }
}
```

### 禁用 Explore 代理

```json
{
  "agent": {
    "explore": {
      "disable": true
    }
  }
}
```

### 为 Build 代理指定模型

```json
{
  "agent": {
    "build": {
      "model": "openai/gpt-4o"
    }
  }
}
```

## TypeScript 代理文件

### 基本模板

```typescript
// .opencode/agent/my-agent.ts
import z from "zod"

export default {
  name: "My Agent",
  description: "A custom agent for specific tasks",
  mode: "subagent" as const,
  prompt: `You are a specialized assistant.

Your capabilities:
- Task 1
- Task 2

Guidelines:
- Be concise
- Focus on accuracy`,
  temperature: 0.5,
  permission: {
    "*": "allow",
    bash: "ask",
  },
  options: {},
}
```

### 代码审查代理示例

```typescript
// .opencode/agent/code-reviewer.ts
export default {
  name: "Code Reviewer",
  description: "Expert code reviewer focusing on best practices and security",
  mode: "subagent" as const,
  prompt: `You are an expert code reviewer with deep knowledge of:
- Software design patterns
- Security best practices
- Performance optimization
- Code maintainability

When reviewing code:
1. Check for security vulnerabilities (OWASP Top 10)
2. Identify performance bottlenecks
3. Suggest improvements for readability
4. Point out potential bugs
5. Recommend better patterns when applicable

Format your review as:
## Summary
Brief overview of the code quality

## Issues Found
- [SEVERITY] Description of issue
  - Location: file:line
  - Suggestion: How to fix

## Recommendations
- Improvement suggestions

Be constructive and specific in your feedback.`,
  temperature: 0.3,
  permission: {
    "*": "deny",
    read: "allow",
    grep: "allow",
    glob: "allow",
  },
  options: {
    focus: ["security", "performance", "maintainability"],
  },
}
```

### 文档生成代理示例

```typescript
// .opencode/agent/doc-generator.ts
export default {
  name: "Documentation Generator",
  description: "Generates comprehensive documentation for code",
  mode: "subagent" as const,
  prompt: `You are a technical documentation specialist.

Your task is to generate clear, comprehensive documentation for code.

Documentation should include:
1. Overview - What the code does
2. API Reference - Functions, classes, methods
3. Usage Examples - How to use the code
4. Configuration - Available options
5. Error Handling - Common errors and solutions

Style guidelines:
- Use clear, concise language
- Include code examples
- Use proper markdown formatting
- Add type information where applicable`,
  temperature: 0.5,
  permission: {
    "*": "deny",
    read: "allow",
    grep: "allow",
    glob: "allow",
    write: {
      "*": "deny",
      "docs/**": "allow",
      "*.md": "allow",
    },
  },
  options: {},
}
```

## 代理加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         代理加载流程                                         │
│                                                                             │
│  1. 加载内置代理                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const result = {                                                    ││
│     │   build: { ... },                                                   ││
│     │   plan: { ... },                                                    ││
│     │   general: { ... },                                                 ││
│     │   explore: { ... },                                                 ││
│     │   // ...                                                            ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 合并配置文件中的代理                                                      │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ for (const [key, value] of Object.entries(cfg.agent ?? {})) {       ││
│     │   if (value.disable) {                                              ││
│     │     delete result[key]  // 禁用代理                                  ││
│     │     continue                                                        ││
│     │   }                                                                 ││
│     │   // 合并或创建代理配置                                               ││
│     │   result[key] = mergeAgent(result[key], value)                      ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 加载代理文件                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ // 扫描 .opencode/agent/*.ts 文件                                   ││
│     │ for (const dir of directories) {                                    ││
│     │   result.agent = mergeDeep(                                         ││
│     │     result.agent,                                                   ││
│     │     await loadAgent(dir)                                            ││
│     │   )                                                                 ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  4. 应用权限合并                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ // 权限优先级: defaults < user < agent-specific                     ││
│     │ item.permission = PermissionNext.merge(                             ││
│     │   item.permission,                                                  ││
│     │   PermissionNext.fromConfig(value.permission ?? {})                 ││
│     │ )                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 设置默认代理

```json
{
  "default_agent": "my-agent"
}
```

## 最佳实践

### 1. 明确的职责划分

```typescript
// 好的做法: 单一职责
export default {
  name: "Security Scanner",
  description: "Scans code for security vulnerabilities",
  // 只关注安全扫描
}

// 避免: 职责过多
export default {
  name: "Super Agent",
  description: "Does everything",
  // 职责不清晰
}
```

### 2. 最小权限原则

```typescript
export default {
  permission: {
    "*": "deny", // 默认拒绝
    read: "allow", // 只开放需要的权限
    grep: "allow",
    glob: "allow",
  },
}
```

### 3. 清晰的提示词

```typescript
export default {
  prompt: `You are a [ROLE].

## Capabilities
- Capability 1
- Capability 2

## Guidelines
1. Guideline 1
2. Guideline 2

## Output Format
Describe expected output format`,
}
```

### 4. 合理的温度设置

| 任务类型 | 推荐温度 |
| -------- | -------- |
| 代码生成 | 0.2-0.4  |
| 代码审查 | 0.3-0.5  |
| 创意写作 | 0.7-0.9  |
| 文档生成 | 0.4-0.6  |

## 下一步

- [多代理协作模式](./multi-agent-patterns.md)
- [技能系统详解](../04-skill-system/README.md)
