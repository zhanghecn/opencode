# Hono 从零理解（路由、中间件、Context）

这篇是给完全没用过 Hono 的同学，目标是你能看懂 OpenCode 里的 `server.ts`。

## 1) Hono 是什么

Hono 可以理解成“HTTP 路由引擎 + 中间件框架”。

它不负责监听端口（这个由 Bun 负责），它负责：

- 定义路径规则（路由）
- 定义请求前后的通用处理（中间件）
- 把请求分发到具体 handler

在 OpenCode 里，分工是：

- Bun 负责网络监听：`Bun.serve`
- Hono 负责请求处理：`App().fetch`

## 2) 最小 Hono 例子

```ts
import { Hono } from "hono"

const app = new Hono()

app.get("/health", (c) => {
  return c.json({ ok: true })
})

app.post("/echo", async (c) => {
  const body = await c.req.json()
  return c.json({ body })
})
```

你可以把 `app` 看成一个“路由表 + 处理链”。

## 3) `Context`（也就是 `c`）是什么

handler 的参数通常叫 `c`，是 Hono 的 `Context`。

常用能力：

- 读请求：`c.req`
- 返回响应：`c.json(...)`、`c.text(...)`
- 读路径参数：`c.req.param("id")`
- 读 query：`c.req.query("name")`

在 OpenCode 里，你会经常看到：

```ts
validator("param", z.object({ ptyID: z.string() }))
const id = c.req.valid("param").ptyID
```

示例见 `packages/opencode/src/server/routes/pty.ts:75`。

## 4) 中间件是什么

中间件是“请求进入 handler 前后”的通用逻辑。

典型用途：

- 鉴权
- 日志
- CORS
- 统一错误处理

Hono 中间件模式：

```ts
app.use(async (c, next) => {
  // 前置逻辑
  await next()
  // 后置逻辑
})
```

在 OpenCode 里中间件顺序很关键，见：

- 错误处理：`packages/opencode/src/server/server.ts:62`
- Basic Auth：`packages/opencode/src/server/server.ts:80`
- 请求日志：`packages/opencode/src/server/server.ts:86`
- CORS：`packages/opencode/src/server/server.ts:103`

## 5) 路由分组（`.route(...)`）

当路由多起来时，会拆成模块：

```ts
app.route("/global", GlobalRoutes())
app.route("/session", SessionRoutes())
```

OpenCode 就是这种组织方式，见 `packages/opencode/src/server/server.ts:124` 到 `packages/opencode/src/server/server.ts:229`。

优点：

- 模块职责清晰
- 更容易维护
- 不同业务域独立演进

## 6) 执行顺序为什么这么重要

中间件和路由是“按注册顺序执行”的。

这会直接影响行为：

- 如果先鉴权再路由，所有路由都受保护
- 如果某个路由在实例中间件之前，就拿不到实例上下文

在 OpenCode 中：

- `/global/*` 在实例中间件之前（全局能力）
- `/session/*` 等在实例中间件之后（依赖 directory 实例）

参考：`packages/opencode/src/server/server.ts:124` 与 `packages/opencode/src/server/server.ts:187`。

## 7) Hono 不只是 JSON：SSE / WebSocket

### SSE

OpenCode 通过 `streamSSE` 推送事件流：

- `packages/opencode/src/server/routes/global.ts:69`

### WebSocket

PTY 路由用 `upgradeWebSocket` 升级连接：

- `packages/opencode/src/server/routes/pty.ts:152`

这说明一个 Hono 应用可以同时承载：

- 普通 REST API
- SSE 实时流
- WebSocket 双向通信

## 8) 统一错误处理为什么放最前面

`onError` 放在最前面可以兜住后续所有路由/中间件抛出的错误：

- `packages/opencode/src/server/server.ts:62`

它会把业务错误统一转成标准 JSON，避免“有的接口返回 HTML 错误页，有的返回纯文本”。

## 9) 你需要先记住的 5 条规则

1. Bun 负责收请求，Hono 负责处理请求。
2. `c` 是请求/响应上下文。
3. 中间件顺序会改变行为。
4. `.route("/prefix", subApp)` 是路由分模块核心。
5. 兜底路由（比如 `.all("/*")`）会吞掉未匹配路径。

---

下一步建议阅读：

- `docs/09-development-guide/opencode-serve-request-lifecycle.md`

这篇会把一个真实请求从 CLI 到最终响应按步骤拆开。
