# OpenCode 请求生命周期（从命令行到 API/页面响应）

这篇把前两篇知识落到 OpenCode 实际代码，目标是：

- 知道请求从哪里进入
- 知道为什么会命中某个路由
- 知道为什么有时返回 API JSON，有时返回页面 HTML

## 1) 总览图：三层职责

```txt
[CLI 层]
  opencode serve
      |
      v
[网络层]
  Bun.serve({ fetch: App().fetch, websocket })
      |
      v
[应用层]
  Hono App(): 中间件 -> 路由 -> fallback proxy
```

## 2) 第 0 步：命令如何触发服务

入口链路：

1. `packages/opencode/src/index.ts`
   - 注册了 `ServeCommand`
2. `packages/opencode/src/cli/cmd/serve.ts:15`
   - 调用 `Server.listen(opts)`
3. `packages/opencode/src/server/server.ts:583`
   - `Bun.serve` 真正启动 HTTP 服务

`serve` 命令本身只负责启动，不负责业务路由。

## 3) 第 1 步：一个请求进入后先过哪些中间件

`App()` 里的处理顺序（简化）见 `packages/opencode/src/server/server.ts:62` 开始：

1. `onError`：统一错误转响应
2. `basicAuth`（如果配置了密码）
3. 请求日志
4. CORS
5. 业务路由

你可以把它想成“请求过滤器链”。

## 4) 第 2 步：路由分流（为什么某些路由有上下文）

关键段落在：

- `packages/opencode/src/server/server.ts:124`
- `packages/opencode/src/server/server.ts:187`
- `packages/opencode/src/server/server.ts:218`

逻辑如下：

- 先处理 `/global/*` 与 `/auth/:providerID`
- 然后执行 `Instance.provide(...)`，根据 `directory` 建立实例上下文
- 再进入 `/project`、`/session`、`/pty`、`/mcp` 等主要业务路由

这就是为什么你会看到：

- `/global/health` 这种接口不一定依赖项目目录
- `/session`、`/project` 这类接口通常和目录上下文关联更强

## 5) 第 3 步：为什么有页面资源（HTML）

在 `packages/opencode/src/server/server.ts:533` 有兜底：

```ts
.all("/*", async (c) => {
  return proxy(`https://app.opencode.ai${c.req.path}`, ...)
})
```

意味着：

- 能匹配到本地 API 路由 -> 本地处理（多为 JSON）
- 匹配不到 -> 代理到 Web 站点（多为 HTML/静态资源）

所以：

- `/doc`：本地 OpenAPI JSON
- `/docs`：本地 Swagger UI 页面（读取 `/doc` 规范）

## 6) 三个真实请求演练

### 案例 A：`GET /global/health`

- 命中 `/global` 子路由（`routes/global.ts`）
- 返回 `{ healthy: true, version: ... }`
- 代码：`packages/opencode/src/server/routes/global.ts:20`

### 案例 B：`GET /session?directory=...`

- 先过实例中间件，拿到 `directory`
- 再进入 `SessionRoutes`
- 路由代码：`packages/opencode/src/server/routes/session.ts`

### 案例 C：`GET /docs`

- 命中本地 `/docs` 路由
- 返回 Swagger UI HTML 页面
- 页面再去请求 `/doc` 获取 OpenAPI JSON

## 7) SDK 是怎么“用到路由”的

你在业务代码里通常看不到 `fetch("/session")`，看到的是：

```ts
client.session.list()
client.project.current()
```

对应关系来自 OpenAPI 生成链：

1. `/doc` 或 `Server.openapi()` 提供 spec
2. SDK 根据 `operationId` 生成调用方法
3. 方法最终仍走 HTTP 请求

相关代码：

- SDK client 入口：`packages/sdk/js/src/client.ts:8`
- spec 生成命令：`packages/opencode/src/cli/cmd/generate.ts:7`

## 8) 进程内“伪网络”调用（高级但很实用）

OpenCode 插件系统里，有一类调用不走真实网卡：

- `fetch: (...args) => Server.App().fetch(...args)`
- 位置：`packages/opencode/src/plugin/index.ts:29`

这意味着：

- 仍走同一套路由与中间件
- 但省去真实 TCP 往返
- 对测试和内部集成很友好

## 9) 排查路径命中问题的实用步骤

当你不确定某个 URL 为什么这样返回时：

1. 先查 `/doc` 里是否存在该 path/method
2. 若不存在，优先怀疑 fallback proxy
3. 看响应头：`application/json` 还是 `text/html`
4. 看服务日志里的 path（请求日志中间件）

建议命令：

```bash
# 启服务
bun run --cwd packages/opencode src/index.ts serve --port 43121

# 看 API
curl -i http://127.0.0.1:43121/doc

# 看一个 API 路径
curl -i http://127.0.0.1:43121/global/health

# 看一个页面路径
curl -i http://127.0.0.1:43121/docs
```

## 10) 你现在应该形成的心智模型

```txt
命令层：决定“启动什么”
网络层：决定“怎么收发请求”
框架层：决定“请求交给谁处理”
业务层：决定“返回什么数据”
fallback：决定“未命中时去哪”
```

如果你能用这 5 层解释一个请求，你就已经不再是“纯前端视角”了。
