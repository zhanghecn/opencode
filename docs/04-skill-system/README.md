# 技能系统概述

技能系统允许用户定义可复用的指令集，为 AI 代理提供特定任务的专业知识和指导。

## 技能系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              技能系统架构                                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         Skill.Info (技能定义)                          │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - name: 技能名称 (唯一标识)                                      │ │ │
│  │  │ - description: 技能描述 (用于 LLM 选择)                          │ │ │
│  │  │ - location: 技能文件路径                                         │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         技能文件位置                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ .opencode/skill/*/SKILL.md      # 项目级技能                     │ │ │
│  │  │ .opencode/skills/*/SKILL.md     # 项目级技能 (复数)              │ │ │
│  │  │ ~/.opencode/skill/*/SKILL.md    # 全局技能                       │ │ │
│  │  │ ~/.opencode/skills/*/SKILL.md   # 全局技能 (复数)                │ │ │
│  │  │ .claude/skills/*/SKILL.md       # Claude Code 兼容               │ │ │
│  │  │ ~/.claude/skills/*/SKILL.md     # 全局 Claude Code 兼容          │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         Skill 工具                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - 列出可用技能                                                   │ │ │
│  │  │ - 加载技能内容                                                   │ │ │
│  │  │ - 返回技能指令给 LLM                                             │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 关键文件

| 文件                 | 职责                  |
| -------------------- | --------------------- |
| `skill/skill.ts`     | 技能加载和管理        |
| `tool/skill.ts`      | Skill 工具实现        |
| `config/markdown.ts` | Markdown 前置数据解析 |

## 技能文件格式

技能使用 Markdown 文件定义，包含 YAML 前置数据：

```markdown
---
name: skill-name
description: 技能描述，用于 LLM 判断何时使用
---

# 技能内容

这里是技能的详细指令...
```

## 技能加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         技能加载流程                                         │
│                                                                             │
│  1. 扫描技能目录                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ // 扫描 .opencode/skill/ 和 .claude/skills/                         ││
│     │ const OPENCODE_SKILL_GLOB = new Bun.Glob("{skill,skills}/**/SKILL.md")││
│     │ const CLAUDE_SKILL_GLOB = new Bun.Glob("skills/**/SKILL.md")        ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 解析技能文件                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const md = await ConfigMarkdown.parse(match)                        ││
│     │ // md.data: { name, description }                                   ││
│     │ // md.content: 技能内容                                              ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 注册技能                                                                 │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ skills[parsed.data.name] = {                                        ││
│     │   name: parsed.data.name,                                           ││
│     │   description: parsed.data.description,                             ││
│     │   location: match,                                                  ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Skill 工具

### 工具描述生成

```typescript
// 文件: packages/opencode/src/tool/skill.ts

const description = [
  "Load a skill to get detailed instructions for a specific task.",
  "Skills provide specialized knowledge and step-by-step guidance.",
  "Use this when a task matches an available skill's description.",
  "Only the skills listed here are available:",
  "<available_skills>",
  ...accessibleSkills.flatMap((skill) => [
    `  <skill>`,
    `    <name>${skill.name}</name>`,
    `    <description>${skill.description}</description>`,
    `  </skill>`,
  ]),
  "</available_skills>",
].join(" ")
```

### 技能执行

```typescript
async execute(params, ctx) {
  const skill = await Skill.get(params.name)

  // 请求权限
  await ctx.ask({
    permission: "skill",
    patterns: [params.name],
    always: [params.name],
    metadata: {},
  })

  // 加载技能内容
  const parsed = await ConfigMarkdown.parse(skill.location)
  const dir = path.dirname(skill.location)

  // 返回技能指令
  return {
    title: `Loaded skill: ${skill.name}`,
    output: [
      `## Skill: ${skill.name}`,
      "",
      `**Base directory**: ${dir}`,
      "",
      parsed.content.trim()
    ].join("\n"),
    metadata: { name: skill.name, dir },
  }
}
```

## 下一步

- [技能开发指南](./skill-development.md)
- [插件系统详解](../05-plugin-system/README.md)
