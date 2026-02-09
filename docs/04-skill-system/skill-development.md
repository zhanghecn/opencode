# 技能开发指南

## 技能文件结构

```
.opencode/
└── skill/
    └── my-skill/
        └── SKILL.md
```

## 基本模板

```markdown
---
name: my-skill
description: 简短描述技能用途，帮助 LLM 判断何时使用此技能
---

# 技能标题

## 使用场景

描述何时应该使用此技能...

## 指令

详细的步骤和指导...

## 示例

提供使用示例...
```

## 完整示例

### 代码审查技能

```markdown
---
name: code-review
description: Use this when reviewing code changes, pull requests, or performing code quality analysis
---

# Code Review Skill

## When to Use

- Reviewing pull requests
- Analyzing code quality
- Checking for best practices
- Security review

## Review Checklist

### 1. Code Quality

- [ ] Code is readable and well-organized
- [ ] Functions are small and focused
- [ ] Variable names are descriptive
- [ ] No code duplication

### 2. Security

- [ ] No hardcoded credentials
- [ ] Input validation present
- [ ] SQL injection prevention
- [ ] XSS prevention

### 3. Performance

- [ ] No unnecessary loops
- [ ] Efficient data structures
- [ ] Proper caching where needed

### 4. Testing

- [ ] Unit tests present
- [ ] Edge cases covered
- [ ] Test coverage adequate

## Output Format

Provide review in this format:

## Summary

Brief overview of the code quality

## Issues Found

- [SEVERITY] Description
  - Location: file:line
  - Suggestion: How to fix

## Recommendations

- Improvement suggestions

## Approved/Changes Requested

Final verdict
```

### 文件操作技能

```markdown
---
name: bun-file-io
description: Use this when working on file operations like reading, writing, scanning, or deleting files
---

## Use this when

- Editing file I/O or scans in `packages/opencode`
- Handling directory operations or external tools

## Bun file APIs

- `Bun.file(path)` is lazy; call `text`, `json`, `stream`, `arrayBuffer`, `bytes`, `exists` to read.
- Metadata: `file.size`, `file.type`, `file.name`.
- `Bun.write(dest, input)` writes strings, buffers, Blobs, Responses, or files.
- `Bun.file(...).delete()` deletes a file.
- `file.writer()` returns a FileSink for incremental writes.
- `Bun.Glob` + `Array.fromAsync(glob.scan({ cwd, absolute, onlyFiles, dot }))` for scans.

## When to use node:fs

- Use `node:fs/promises` for directories (`mkdir`, `readdir`, recursive operations).

## Quick checklist

- Use Bun APIs first.
- Use `path.join`/`path.resolve` for paths.
- Prefer promise `.catch(...)` over `try/catch` when possible.
```

### Git 工作流技能

```markdown
---
name: git-workflow
description: Use this when performing git operations like commits, branches, merges, or resolving conflicts
---

# Git Workflow Skill

## Commit Guidelines

### Commit Message Format
```

<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

## Branch Naming

- `feature/description`
- `fix/issue-number-description`
- `hotfix/description`

## Workflow Steps

### Creating a Feature Branch

1. `git checkout main`
2. `git pull origin main`
3. `git checkout -b feature/my-feature`

### Committing Changes

1. `git add -p` (review changes)
2. `git commit -m "type(scope): message"`

### Creating Pull Request

1. `git push -u origin feature/my-feature`
2. Create PR with description
3. Request review

## Conflict Resolution

1. `git fetch origin`
2. `git rebase origin/main`
3. Resolve conflicts in each file
4. `git add <resolved-files>`
5. `git rebase --continue`

````

### API 开发技能

```markdown
---
name: api-development
description: Use this when creating or modifying REST API endpoints, handling requests, or designing API schemas
---

# API Development Skill

## Endpoint Design

### URL Structure
````

GET /api/v1/resources # List
GET /api/v1/resources/:id # Get one
POST /api/v1/resources # Create
PUT /api/v1/resources/:id # Update
DELETE /api/v1/resources/:id # Delete

````

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}
````

### Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

## Validation

- Validate all input parameters
- Use Zod schemas for type safety
- Return meaningful error messages

## Security

- Authenticate all endpoints
- Authorize based on user roles
- Rate limit sensitive endpoints
- Sanitize all inputs

## Testing

- Test happy path
- Test error cases
- Test edge cases
- Test authentication/authorization

````

## 技能设计最佳实践

### 1. 清晰的描述

```markdown
---
name: my-skill
description: Use this when [specific scenario]. It provides [specific value].
---
````

描述应该：

- 明确说明使用场景
- 帮助 LLM 判断何时调用
- 简洁但信息完整

### 2. 结构化内容

```markdown
# 技能标题

## 使用场景

何时使用此技能

## 前置条件

使用前需要满足的条件

## 步骤

1. 第一步
2. 第二步
3. 第三步

## 示例

具体的使用示例

## 注意事项

需要注意的问题
```

### 3. 可操作的指令

```markdown
## 步骤

### 1. 分析需求

- 确定输入和输出
- 识别边界条件
- 列出依赖项

### 2. 实现

- 创建必要的文件
- 编写核心逻辑
- 添加错误处理

### 3. 验证

- 运行测试
- 检查边界条件
- 验证输出格式
```

### 4. 包含检查清单

```markdown
## 完成检查清单

- [ ] 代码符合项目规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 没有引入安全漏洞
- [ ] 性能符合要求
```

## 技能权限控制

技能可以通过代理权限系统控制访问：

```json
// opencode.json
{
  "agent": {
    "build": {
      "permission": {
        "skill": {
          "*": "allow",
          "dangerous-skill": "deny"
        }
      }
    }
  }
}
```

## 技能与代理协作

技能可以指导代理使用特定的子代理：

```markdown
---
name: comprehensive-analysis
description: Use this for comprehensive code analysis
---

# Comprehensive Analysis

## Steps

1. **Explore the codebase**
   Use the `explore` agent to find relevant files:
   - Search for patterns
   - Identify dependencies

2. **Analyze code quality**
   Use the `code-reviewer` agent (if available) to:
   - Check for issues
   - Suggest improvements

3. **Generate report**
   Compile findings into a structured report
```

## 调试技能

### 检查技能是否加载

```bash
# 在 OpenCode 中查看可用技能
# LLM 会在 Skill 工具描述中列出所有可用技能
```

### 常见问题

1. **技能未加载**
   - 检查文件路径是否正确
   - 确认 SKILL.md 文件名正确
   - 验证 YAML 前置数据格式

2. **技能名称冲突**
   - 检查是否有重复的技能名称
   - 后加载的技能会覆盖先前的

3. **描述不清晰**
   - LLM 可能无法正确判断何时使用
   - 改进描述，使其更具体

## 下一步

- [插件系统详解](../05-plugin-system/README.md)
- [MCP 集成](../06-mcp-integration/README.md)
