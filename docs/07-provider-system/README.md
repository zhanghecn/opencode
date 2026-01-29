# 提供商系统

提供商系统管理 OpenCode 与各种 AI 模型提供商的集成，支持多种 AI 服务。

## 提供商架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              提供商系统架构                                   │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         Provider.Info (提供商定义)                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ - id: 提供商 ID                                                  │ │ │
│  │  │ - name: 显示名称                                                 │ │ │
│  │  │ - source: 来源 (env/config/custom/api)                          │ │ │
│  │  │ - env: 环境变量列表                                              │ │ │
│  │  │ - options: 配置选项                                              │ │ │
│  │  │ - models: 可用模型列表                                           │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         内置提供商                                     │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │anthropic│ │ openai  │ │ google  │ │  azure  │ │ bedrock │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │openrouter│ │  groq   │ │ mistral │ │  xai    │ │ vertex  │        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │ │
│  │  │ copilot │ │ gitlab  │ │ cohere  │ │cerebras │ │deepinfra│        │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         AI SDK 集成                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │ @ai-sdk/anthropic, @ai-sdk/openai, @ai-sdk/google, ...          │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 关键文件

| 文件 | 职责 |
|------|------|
| `provider/provider.ts` | 提供商管理和模型加载 |
| `provider/models.ts` | 模型定义数据 |
| `provider/transform.ts` | 提供商特定转换 |
| `auth/index.ts` | 认证管理 |

## 支持的提供商

| 提供商 | SDK 包 | 环境变量 |
|--------|--------|----------|
| Anthropic | `@ai-sdk/anthropic` | `ANTHROPIC_API_KEY` |
| OpenAI | `@ai-sdk/openai` | `OPENAI_API_KEY` |
| Google | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Azure | `@ai-sdk/azure` | `AZURE_OPENAI_API_KEY` |
| Amazon Bedrock | `@ai-sdk/amazon-bedrock` | `AWS_ACCESS_KEY_ID` |
| Google Vertex | `@ai-sdk/google-vertex` | `GOOGLE_CLOUD_PROJECT` |
| OpenRouter | `@openrouter/ai-sdk-provider` | `OPENROUTER_API_KEY` |
| Groq | `@ai-sdk/groq` | `GROQ_API_KEY` |
| Mistral | `@ai-sdk/mistral` | `MISTRAL_API_KEY` |
| xAI | `@ai-sdk/xai` | `XAI_API_KEY` |
| GitHub Copilot | 内置 | OAuth |
| GitLab | `@gitlab/gitlab-ai-provider` | `GITLAB_TOKEN` |
| Cohere | `@ai-sdk/cohere` | `COHERE_API_KEY` |
| Cerebras | `@ai-sdk/cerebras` | `CEREBRAS_API_KEY` |
| DeepInfra | `@ai-sdk/deepinfra` | `DEEPINFRA_API_KEY` |
| Together AI | `@ai-sdk/togetherai` | `TOGETHER_AI_API_KEY` |
| Perplexity | `@ai-sdk/perplexity` | `PERPLEXITY_API_KEY` |

## 提供商配置

### 环境变量方式

```bash
# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# OpenAI
export OPENAI_API_KEY="sk-..."

# Google
export GOOGLE_GENERATIVE_AI_API_KEY="..."

# Azure
export AZURE_OPENAI_API_KEY="..."
export AZURE_OPENAI_ENDPOINT="https://..."
```

### 配置文件方式

```json
// opencode.json
{
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "sk-ant-..."
      }
    },
    "openai": {
      "options": {
        "apiKey": "sk-...",
        "baseURL": "https://custom.openai.com/v1"
      }
    }
  }
}
```

### 自定义提供商

```json
{
  "provider": {
    "my-provider": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "https://my-api.example.com/v1",
        "apiKey": "..."
      },
      "models": {
        "my-model": {
          "name": "My Custom Model",
          "limit": {
            "context": 128000,
            "output": 4096
          },
          "cost": {
            "input": 0.001,
            "output": 0.002
          }
        }
      }
    }
  }
}
```

## 模型定义

```typescript
// Provider.Model 结构
{
  id: string,              // 模型 ID
  providerID: string,      // 提供商 ID
  name: string,            // 显示名称
  family: string,          // 模型系列
  capabilities: {
    temperature: boolean,  // 支持温度参数
    reasoning: boolean,    // 支持推理
    attachment: boolean,   // 支持附件
    toolcall: boolean,     // 支持工具调用
    input: {
      text: boolean,
      audio: boolean,
      image: boolean,
      video: boolean,
      pdf: boolean,
    },
    output: {
      text: boolean,
      audio: boolean,
      image: boolean,
      video: boolean,
      pdf: boolean,
    },
    interleaved: boolean,  // 支持交错推理
  },
  cost: {
    input: number,         // 输入成本 ($/1M tokens)
    output: number,        // 输出成本 ($/1M tokens)
    cache: {
      read: number,
      write: number,
    },
  },
  limit: {
    context: number,       // 上下文窗口
    input: number,         // 最大输入
    output: number,        // 最大输出
  },
  status: "alpha" | "beta" | "deprecated" | "active",
}
```

## 提供商加载流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         提供商加载流程                                       │
│                                                                             │
│  1. 加载模型定义                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const models = await ModelsDev.load()                               ││
│     │ // 从 models.dev 获取最新模型定义                                    ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  2. 检测可用提供商                                                           │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ for (const provider of providers) {                                 ││
│     │   // 检查环境变量                                                    ││
│     │   const hasEnv = provider.env.some(e => Env.get(e))                 ││
│     │   // 检查认证存储                                                    ││
│     │   const hasAuth = await Auth.get(provider.id)                       ││
│     │   // 检查配置文件                                                    ││
│     │   const hasConfig = config.provider?.[provider.id]                  ││
│     │ }                                                                   ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  3. 初始化 SDK                                                               │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const sdk = BUNDLED_PROVIDERS[provider.npm](options)                ││
│     │ // 或动态安装                                                        ││
│     │ const mod = await import(await BunProc.install(provider.npm))       ││
│     └─────────────────────────────────────────────────────────────────────┘│
│                                      │                                      │
│                                      ▼                                      │
│  4. 获取语言模型                                                             │
│     ┌─────────────────────────────────────────────────────────────────────┐│
│     │ const language = await Provider.getLanguage(model)                  ││
│     │ // 返回 AI SDK 兼容的语言模型实例                                    ││
│     └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 认证方式

### API Key

```bash
# 通过环境变量
export ANTHROPIC_API_KEY="sk-ant-..."

# 通过 opencode auth 命令
opencode auth anthropic
```

### OAuth

```bash
# GitHub Copilot
opencode auth github-copilot

# GitLab
opencode auth gitlab
```

### AWS 凭证

```bash
# 环境变量
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_REGION="us-east-1"

# 或使用 AWS Profile
export AWS_PROFILE="my-profile"
```

### Google Cloud

```bash
# 项目 ID
export GOOGLE_CLOUD_PROJECT="my-project"

# 应用默认凭证
gcloud auth application-default login
```

## 设置默认模型

```json
// opencode.json
{
  "model": "anthropic/claude-sonnet-4-20250514"
}
```

或使用环境变量：

```bash
export OPENCODE_MODEL="anthropic/claude-sonnet-4-20250514"
```

## 模型选择

```bash
# 列出可用模型
opencode model list

# 设置模型
opencode model set anthropic/claude-sonnet-4-20250514
```

## 自定义加载器

某些提供商需要特殊处理：

```typescript
const CUSTOM_LOADERS = {
  // Anthropic 需要特殊请求头
  async anthropic() {
    return {
      autoload: false,
      options: {
        headers: {
          "anthropic-beta": "claude-code-20250219,interleaved-thinking-2025-05-14",
        },
      },
    }
  },

  // Amazon Bedrock 需要 AWS 凭证
  async "amazon-bedrock"() {
    const { fromNodeProviderChain } = await import("@aws-sdk/credential-providers")
    return {
      autoload: true,
      options: {
        region: "us-east-1",
        credentialProvider: fromNodeProviderChain(),
      },
    }
  },

  // Google Vertex 需要项目配置
  async "google-vertex"() {
    const project = Env.get("GOOGLE_CLOUD_PROJECT")
    const location = Env.get("GOOGLE_CLOUD_LOCATION") ?? "us-east5"
    return {
      autoload: Boolean(project),
      options: { project, location },
    }
  },
}
```

## 最佳实践

### 1. 使用环境变量

```bash
# 不要在配置文件中硬编码 API Key
# 使用环境变量或 opencode auth
export ANTHROPIC_API_KEY="sk-ant-..."
```

### 2. 选择合适的模型

| 任务类型 | 推荐模型 |
|----------|----------|
| 代码生成 | Claude Sonnet, GPT-4o |
| 快速响应 | Claude Haiku, GPT-4o-mini |
| 复杂推理 | Claude Opus, o1 |
| 长上下文 | Claude (200K), Gemini (1M) |

### 3. 成本控制

```json
// 为不同代理使用不同模型
{
  "agent": {
    "build": {
      "model": "anthropic/claude-sonnet-4-20250514"
    },
    "explore": {
      "model": "anthropic/claude-haiku-3-5-20241022"
    }
  }
}
```

## 下一步
- [定制化指南](../08-customization-guide/build-your-agent.md)
- [多智能体系统](../08-customization-guide/multi-agent-system.md)
