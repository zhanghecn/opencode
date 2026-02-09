# 多智能体系统

本指南介绍如何使用 OpenCode 构建多智能体协作系统。

## 多智能体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         多智能体系统架构                                     │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         协调层                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ 主代理 (Orchestrator)                                           │ │ │
│  │  │ - 接收用户请求                                                   │ │ │
│  │  │ - 分析任务需求                                                   │ │ │
│  │  │ - 分配子任务                                                     │ │ │
│  │  │ - 汇总结果                                                       │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                    ┌─────────────────┼─────────────────┐                   │
│                    │                 │                 │                   │
│                    ▼                 ▼                 ▼                   │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         专家层                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │ 代码专家    │ │ 测试专家    │ │ 文档专家    │ │ 安全专家    │     │ │
│  │  │ (coder)     │ │ (tester)    │ │ (doc)       │ │ (security)  │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         工具层                                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │ │
│  │  │ 文件操作    │ │ 代码分析    │ │ 测试运行    │ │ API 调用    │     │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 设计模式

### 模式 1: 主从模式

一个主代理协调多个专业子代理。

```json
// opencode.json
{
  "default_agent": "orchestrator",
  "agent": {
    "orchestrator": {
      "name": "Orchestrator",
      "description": "Main agent that coordinates other agents",
      "mode": "primary",
      "prompt": "You are the main coordinator..."
    },
    "coder": {
      "name": "Coder",
      "description": "Expert in writing code",
      "mode": "subagent"
    },
    "tester": {
      "name": "Tester",
      "description": "Expert in writing tests",
      "mode": "subagent"
    },
    "reviewer": {
      "name": "Reviewer",
      "description": "Expert in code review",
      "mode": "subagent"
    }
  }
}
```

### 模式 2: 流水线模式

任务按顺序流经多个代理。

```
用户请求 → 分析代理 → 实现代理 → 测试代理 → 审查代理 → 完成
```

```json
{
  "agent": {
    "analyzer": {
      "name": "Analyzer",
      "description": "Analyzes requirements and creates plan",
      "mode": "subagent"
    },
    "implementer": {
      "name": "Implementer",
      "description": "Implements the plan",
      "mode": "subagent"
    },
    "tester": {
      "name": "Tester",
      "description": "Tests the implementation",
      "mode": "subagent"
    },
    "reviewer": {
      "name": "Reviewer",
      "description": "Reviews the final result",
      "mode": "subagent"
    }
  }
}
```

### 模式 3: 专家委员会模式

多个专家代理并行分析，然后汇总意见。

```
                    ┌─→ 安全专家 ─┐
用户请求 → 主代理 ─┼─→ 性能专家 ─┼─→ 汇总 → 结果
                    └─→ 质量专家 ─┘
```

## 完整示例：软件开发团队

### 配置文件

```json
// opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-20250514",
  "default_agent": "tech-lead",
  "agent": {
    "tech-lead": {
      "name": "Tech Lead",
      "description": "Technical lead who coordinates the development team",
      "mode": "primary",
      "prompt": "You are a technical lead coordinating a development team...",
      "temperature": 0.5
    },
    "frontend-dev": {
      "name": "Frontend Developer",
      "description": "Expert in frontend development (React, TypeScript, CSS)",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "permission": {
        "*": "deny",
        "read": "allow",
        "write": { "src/components/**": "allow", "src/pages/**": "allow" },
        "edit": { "src/components/**": "allow", "src/pages/**": "allow" }
      }
    },
    "backend-dev": {
      "name": "Backend Developer",
      "description": "Expert in backend development (Node.js, APIs, databases)",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "permission": {
        "*": "deny",
        "read": "allow",
        "write": { "src/api/**": "allow", "src/services/**": "allow" },
        "edit": { "src/api/**": "allow", "src/services/**": "allow" }
      }
    },
    "qa-engineer": {
      "name": "QA Engineer",
      "description": "Expert in testing and quality assurance",
      "mode": "subagent",
      "model": "anthropic/claude-haiku-3-5-20241022",
      "permission": {
        "*": "deny",
        "read": "allow",
        "write": { "tests/**": "allow" },
        "edit": { "tests/**": "allow" },
        "bash": "allow"
      }
    },
    "security-expert": {
      "name": "Security Expert",
      "description": "Expert in security analysis and vulnerability detection",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
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

### Tech Lead 提示词

```typescript
// .opencode/agent/tech-lead.ts
export default {
  name: "Tech Lead",
  mode: "primary" as const,
  prompt: `You are a technical lead coordinating a software development team.

## Your Team
- Frontend Developer: Expert in React, TypeScript, CSS
- Backend Developer: Expert in Node.js, APIs, databases
- QA Engineer: Expert in testing
- Security Expert: Expert in security analysis

## Your Responsibilities
1. Understand user requirements
2. Break down tasks for team members
3. Coordinate work between team members
4. Review and integrate results
5. Ensure quality and security

## How to Delegate
Use the Task tool to delegate work to team members:
- For UI work: use frontend-dev agent
- For API work: use backend-dev agent
- For testing: use qa-engineer agent
- For security review: use security-expert agent

## Workflow
1. Analyze the request
2. Create a plan
3. Delegate tasks to appropriate team members
4. Review results
5. Integrate and deliver

Always ensure code is tested and reviewed before delivery.`,
  temperature: 0.5,
}
```

### 协作技能

```markdown
## <!-- .opencode/skill/team-workflow/SKILL.md -->

name: team-workflow
description: Use this when coordinating team work

---

# Team Workflow

## Task Delegation

### Frontend Tasks

Delegate to frontend-dev:

- UI components
- Page layouts
- Styling
- Client-side logic

### Backend Tasks

Delegate to backend-dev:

- API endpoints
- Database operations
- Business logic
- Server-side validation

### Testing Tasks

Delegate to qa-engineer:

- Unit tests
- Integration tests
- E2E tests

### Security Tasks

Delegate to security-expert:

- Security review
- Vulnerability scanning
- Best practices check

## Coordination Steps

1. **Analyze Request**
   - Understand requirements
   - Identify components

2. **Plan Work**
   - Break into tasks
   - Assign to team members

3. **Execute**
   - Delegate tasks
   - Monitor progress

4. **Review**
   - Check results
   - Request changes if needed

5. **Integrate**
   - Combine work
   - Final testing
```

## 通信机制

### 使用 Task 工具

```typescript
// 主代理调用子代理
await Task({
  prompt: "Implement the login form component",
  description: "Frontend task",
  subagent_type: "frontend-dev",
})
```

### 并行执行

```typescript
// 并行执行多个任务
await Promise.all([
  Task({
    prompt: "Implement frontend",
    subagent_type: "frontend-dev",
  }),
  Task({
    prompt: "Implement backend",
    subagent_type: "backend-dev",
  }),
])
```

### 顺序执行

```typescript
// 顺序执行任务
const analysis = await Task({
  prompt: "Analyze requirements",
  subagent_type: "analyzer",
})

const implementation = await Task({
  prompt: `Implement based on: ${analysis}`,
  subagent_type: "implementer",
})

const tests = await Task({
  prompt: `Write tests for: ${implementation}`,
  subagent_type: "tester",
})
```

## 最佳实践

### 1. 明确职责划分

```json
{
  "agent": {
    "frontend": {
      "description": "ONLY handles frontend code in src/components and src/pages"
    },
    "backend": {
      "description": "ONLY handles backend code in src/api and src/services"
    }
  }
}
```

### 2. 权限隔离

```json
{
  "agent": {
    "frontend": {
      "permission": {
        "write": { "src/components/**": "allow", "src/pages/**": "allow" }
      }
    },
    "backend": {
      "permission": {
        "write": { "src/api/**": "allow", "src/services/**": "allow" }
      }
    }
  }
}
```

### 3. 模型优化

```json
{
  "agent": {
    "complex-task": {
      "model": "anthropic/claude-opus-4-20250514"
    },
    "simple-task": {
      "model": "anthropic/claude-haiku-3-5-20241022"
    }
  }
}
```

### 4. 错误处理

主代理应该处理子代理的错误：

```
如果子代理失败:
1. 分析错误原因
2. 尝试修复或重试
3. 如果无法解决，向用户报告
```

### 5. 结果验证

主代理应该验证子代理的输出：

```
1. 检查输出完整性
2. 验证格式正确性
3. 确认任务完成度
4. 必要时请求修改
```

## 高级模式

### 自适应团队

根据任务类型动态选择代理：

```typescript
// 主代理提示词
;`Based on the task type, delegate to:
- UI tasks → frontend-dev
- API tasks → backend-dev
- Database tasks → backend-dev
- Testing tasks → qa-engineer
- Security concerns → security-expert

Analyze the request and choose the appropriate team member.`
```

### 迭代改进

多轮迭代直到满足要求：

```
1. 实现 → 2. 测试 → 3. 审查 → 4. 修复 → 重复直到通过
```

### 知识共享

使用技能在代理间共享知识：

```markdown
## <!-- .opencode/skill/project-conventions/SKILL.md -->

name: project-conventions
description: Project coding conventions for all team members

---

# Project Conventions

## Code Style

- Use TypeScript
- Follow ESLint rules
- Use Prettier formatting

## Naming

- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE

## File Structure

- Components in src/components
- Pages in src/pages
- API in src/api
```

## 监控和调试

### 查看代理状态

```bash
# 列出所有代理
/agent list
```

### 查看任务执行

主代理会在输出中显示子代理的执行结果。

### 日志分析

检查 OpenCode 日志了解代理交互详情。

## 下一步

- [插件开发指南](../05-plugin-system/plugin-development.md)
- [MCP 集成](../06-mcp-integration/README.md)
