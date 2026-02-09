# Serve 路由工作流（从启动到 API/页面返回）

这篇文档专门回答两个问题：

1. 路由是怎么被使用的，代码在哪
2. 为什么有时会返回页面资源（HTML）而不是 API JSON

## 1) 从 `opencode serve` 到 HTTP 服务启动

请求链路入口不是 `server.ts`，而是先走 CLI 命令注册：

1. `packages/opencode/src/index.ts`
   - 注册 `ServeCommand`（命令名 `serve`）
2. `packages/opencode/src/cli/cmd/serve.ts`
   - 解析网络参数（`withNetworkOptions` / `resolveNetworkOptions`）
   - 调用 `Server.listen(opts)` 启动服务
3. `packages/opencode/src/server/server.ts`
   - `Server.listen` 里用 `Bun.serve` 绑定 `fetch: App().fetch`

端口逻辑要点：

- CLI 参数默认 `--port=0`（见 `packages/opencode/src/cli/network.ts`）
- 当 `port=0` 时，服务器会先尝试 `4096`，失败再让系统分配随机端口

## 2) 一个 HTTP 请求如何命中路由

核心在 `packages/opencode/src/server/server.ts` 的 `App()`：

```txt
HTTP request
  -> onError
  -> basicAuth (可选)
  -> request logging
  -> CORS
  -> /global/*
  -> /auth/:providerID
  -> Instance.provide(directory)
  -> /doc (OpenAPI)
  -> /project /session /pty /mcp ...
  -> .all("/*") fallback proxy 到 https://app.opencode.ai
```

几个关键点：

- `/global/*` 和 `/auth/:providerID` 在实例中间件之前
- 绝大多数业务接口在实例中间件之后，会用到 `directory`
- `directory` 来源优先级：query `directory` -> header `x-opencode-directory` -> `process.cwd()`
- 未命中任何 API 路由时，会落到兜底 `proxy`

## 3) 路由是“谁”在调用（使用场景）

### A. 外部客户端通过 SDK 调用

- `packages/sdk/js/src/client.ts`
  - `createOpencodeClient` 封装 `fetch`
  - 若传 `directory`，自动加 `x-opencode-directory` header
- `packages/app/src/context/global-sdk.tsx`
  - App 用 `createOpencodeClient({ baseUrl: server.url })` 调用服务

也就是说，业务代码通常写成：

```ts
client.session.list()
client.project.current()
```

底层再映射到 HTTP 路由（映射来自 OpenAPI 生成代码）。

### B. 进程内调用（不走真实网络）

- `packages/opencode/src/plugin/index.ts`
  - 插件系统创建 SDK client 时，`fetch` 指向 `Server.App().fetch`
  - 这属于“同进程内请求”，但仍复用同一套路由处理链

### C. OpenAPI 与 SDK 的关系

- `GET /doc` 返回 OpenAPI JSON
- `packages/opencode/src/cli/cmd/generate.ts` 通过 `Server.openapi()` 生成 spec
- SDK 生成代码再根据 `operationId` 绑定到 `client.xxx.yyy()`

## 4) 为什么会出现页面资源（HTML）

你看到页面资源是正常现象，不是路由错乱。

原因：`server.ts` 末尾有兜底路由：

- `.all("/*")` 把未命中 API 的请求代理到 `https://app.opencode.ai`

因此：

- `GET /doc` -> 本地 OpenAPI JSON（API 文档）
- `GET /docs` -> 本地 Swagger UI 页面（会读取 `/doc` 作为规范源）

## 5) 快速判断某个路径是 API 还是页面

1. 先看是否在 `/doc` 的 `paths` 里
2. 不在的话，通常会被 fallback 代理成页面资源（`/docs` 是本地文档 UI 例外）
3. 响应头也能辅助判断：
   - `application/json` 常见于 API
   - `text/html` 多数是页面资源

示例命令：

```bash
# 1) 启动服务（示例端口）
bun run --cwd packages/opencode src/index.ts serve --port 43111

# 2) 健康检查
curl -s http://127.0.0.1:43111/global/health

# 3) API 文档（OpenAPI JSON）
curl -s http://127.0.0.1:43111/doc

# 4) `/docs` 返回本地可视化文档页（Swagger UI）
curl -i http://127.0.0.1:43111/docs
```

## 6) 路由代码索引（按模块找）

- 路由总装配：`packages/opencode/src/server/server.ts`
- 全局路由：`packages/opencode/src/server/routes/global.ts`
- 项目：`packages/opencode/src/server/routes/project.ts`
- 会话：`packages/opencode/src/server/routes/session.ts`
- 终端 PTY：`packages/opencode/src/server/routes/pty.ts`
- 提供商：`packages/opencode/src/server/routes/provider.ts`
- MCP：`packages/opencode/src/server/routes/mcp.ts`
- 文件与检索：`packages/opencode/src/server/routes/file.ts`
- 其他：`config.ts`、`experimental.ts`、`permission.ts`、`question.ts`、`tui.ts`

如果你下一步想看“某个按钮在 App 里最终打到哪个 API”，建议从 `packages/app/src/context/` 下的 SDK 调用点反查到 `operationId`，再去 `/doc` 对照 path/method。
