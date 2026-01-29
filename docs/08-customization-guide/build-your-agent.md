# 构建你的智能体

本指南将帮助你基于 OpenCode 构建自定义的 AI 智能体。

## 定制化层次

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         定制化层次                                           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 层次 1: 配置定制 (最简单)                                              │ │
│  │ - 修改 opencode.json                                                  │ │
│  │ - 调整代理参数、权限、模型                                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 层次 2: 技能扩展                                                       │ │
│  │ - 创建 SKILL.md 文件                                                  │ │
│  │ - 提供专业领域知识                                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 层次 3: 工具扩展                                                       │ │
│  │ - 创建自定义工具                                                       │ │
│  │ - 集成外部 API                                                        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 层次 4: 插件开发                                                       │ │
│  │ - 钩子函数扩展                                                         │ │
│  │ - 深度定制行为                                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ 层次 5: 源码修改 (最复杂)                                              │ │
│  │ - Fork 项目                                                           │ │
│  │ - 修改核心逻辑                                                         │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 创建项目配置

```bash
# 在项目根目录创建配置文件
touch opencode.json
```

```json
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "agent": {},
  "permission": {},
  "plugin": []
}
```

### 2. 创建自定义代理

```json
{
  "agent": {
    "my-assistant": {
      "name": "My Assistant",
      "description": "A specialized assistant for my project",
      "mode": "primary",
      "prompt": "You are a helpful assistant specialized in...",
      "temperature": 0.5
    }
  },
  "default_agent": "my-assistant"
}
```

### 3. 添加技能

```bash
mkdir -p .opencode/skill/my-skill
```

```markdown
<!-- .opencode/skill/my-skill/SKILL.md -->
---
name: my-skill
description: Use this when working on specific tasks
---

# My Skill

## Guidelines
- Guideline 1
- Guideline 2

## Steps
1. Step 1
2. Step 2
```

### 4. 添加自定义工具

```typescript
// .opencode/tool/my-tool.ts
import z from "zod"

export default {
  description: "My custom tool",
  args: {
    input: z.string().describe("Input parameter"),
  },
  async execute(args, ctx) {
    return `Processed: ${args.input}`
  },
}
```

## 完整示例：代码审查助手

### 项目结构

```
my-project/
├── opencode.json
└── .opencode/
    ├── agent/
    │   └── code-reviewer.ts
    ├── skill/
    │   └── code-review/
    │       └── SKILL.md
    └── tool/
        └── lint-check.ts
```

### 配置文件

```json
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "default_agent": "code-reviewer",
  "agent": {
    "code-reviewer": {
      "name": "Code Reviewer",
      "description": "Expert code reviewer for this project",
      "mode": "primary",
      "temperature": 0.3,
      "permission": {
        "edit": "deny",
        "write": "deny"
      }
    }
  }
}
```

### 代理定义

```typescript
// .opencode/agent/code-reviewer.ts
export default {
  name: "Code Reviewer",
  description: "Expert code reviewer focusing on best practices",
  mode: "primary" as const,
  prompt: `You are an expert code reviewer for this project.

## Your Role
- Review code changes for quality and best practices
- Identify potential bugs and security issues
- Suggest improvements

## Review Process
1. Understand the context of changes
2. Check for common issues
3. Provide constructive feedback

## Output Format
Use the following format for reviews:

### Summary
Brief overview

### Issues
- [SEVERITY] Description

### Suggestions
- Improvement ideas`,
  temperature: 0.3,
  permission: {
    "*": "deny",
    "read": "allow",
    "grep": "allow",
    "glob": "allow",
    "lint-check": "allow",
  },
}
```

### 技能定义

```markdown
<!-- .opencode/skill/code-review/SKILL.md -->
---
name: code-review
description: Use this when reviewing code changes
---

# Code Review Skill

## Checklist

### Code Quality
- [ ] Code is readable
- [ ] Functions are focused
- [ ] No duplication

### Security
- [ ] No hardcoded secrets
- [ ] Input validation
- [ ] SQL injection prevention

### Performance
- [ ] Efficient algorithms
- [ ] Proper caching

### Testing
- [ ] Tests present
- [ ] Edge cases covered
```

### 自定义工具

```typescript
// .opencode/tool/lint-check.ts
import z from "zod"

export default {
  description: "Run linting on specified files",
  args: {
    files: z.array(z.string()).describe("Files to lint"),
  },
  async execute(args, ctx) {
    const results: string[] = []

    for (const file of args.files) {
      // 模拟 lint 检查
      results.push(`Checked: ${file}`)
    }

    return results.join("\n")
  },
}
```

## 完整示例：文档生成助手

### 配置

```json
{
  "agent": {
    "doc-writer": {
      "name": "Documentation Writer",
      "description": "Generates and maintains documentation",
      "mode": "primary",
      "temperature": 0.5,
      "permission": {
        "*": "deny",
        "read": "allow",
        "grep": "allow",
        "glob": "allow",
        "write": {
          "docs/**": "allow",
          "*.md": "allow"
        }
      }
    }
  }
}
```

### 技能

```markdown
---
name: doc-generation
description: Use this when generating documentation
---

# Documentation Generation

## Structure
- README.md - Project overview
- docs/api.md - API reference
- docs/guide.md - User guide

## Style
- Clear and concise
- Include examples
- Use proper markdown

## Process
1. Analyze code structure
2. Extract public APIs
3. Generate documentation
4. Add examples
```

## 权限配置最佳实践

### 只读代理

```json
{
  "agent": {
    "analyzer": {
      "permission": {
        "*": "deny",
        "read": "allow",
        "grep": "allow",
        "glob": "allow"
      }
    }
  }
}
```

### 受限写入代理

```json
{
  "agent": {
    "doc-writer": {
      "permission": {
        "*": "deny",
        "read": "allow",
        "write": {
          "docs/**": "allow"
        },
        "edit": {
          "docs/**": "allow"
        }
      }
    }
  }
}
```

### 完全权限代理

```json
{
  "agent": {
    "developer": {
      "permission": {
        "*": "allow",
        "bash": "ask"
      }
    }
  }
}
```

## 模型选择策略

### 按任务类型

```json
{
  "agent": {
    "coder": {
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "reviewer": {
      "model": "anthropic/claude-haiku-3-5-20241022"
    },
    "architect": {
      "model": "anthropic/claude-opus-4-20250514"
    }
  }
}
```

### 成本优化

```json
{
  "agent": {
    "explore": {
      "model": "anthropic/claude-haiku-3-5-20241022"
    },
    "build": {
      "model": "anthropic/claude-sonnet-4-20250514"
    }
  }
}
```

## 调试技巧

### 查看代理配置

```bash
# 在 OpenCode 中
/agent list
```

### 查看可用工具

```bash
# 在 OpenCode 中
/tools
```

### 查看技能

```bash
# 技能会在 Skill 工具描述中列出
```

## 下一步
- [多智能体系统](./multi-agent-system.md)
- [插件开发指南](../05-plugin-system/plugin-development.md)
