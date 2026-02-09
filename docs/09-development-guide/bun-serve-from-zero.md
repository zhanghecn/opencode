# Bun.serve 从零理解（给第一次接触服务端的同学）

如果你对服务端几乎是空白，这篇先只解决一个问题：

> `Bun.serve({ fetch: App().fetch })` 到底是什么意思？

## 1) 先把核心概念说清楚

`Bun.serve` 可以理解成：

- 打开一个网络端口
- 持续接收 HTTP 请求
- 每收到一个请求，就调用你提供的处理函数

这个处理函数就是 `fetch`。

最小例子：

```ts
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("hello")
  },
})
```

含义：

- 浏览器访问 `http://localhost:3000`
- Bun 把请求包装成 `Request` 对象
- 调用 `fetch(req)`
- 你返回一个 `Response`
- Bun 把这个 `Response` 发送给浏览器

## 2) `fetch` 参数和返回值是什么

### `Request`

`Request` 里有你常见的 HTTP 信息：

- 方法：`req.method`（GET/POST/...）
- 路径：`new URL(req.url).pathname`
- 查询参数：`new URL(req.url).searchParams`
- 请求头：`req.headers`
- 请求体：`await req.json()` / `await req.text()`

### `Response`

你返回给客户端的数据。

```ts
return Response.json({ ok: true })
```

或

```ts
return new Response("not found", { status: 404 })
```

## 3) 为什么是 `fetch: App().fetch`

在 OpenCode 里，`Bun.serve` 配置如下：

- `packages/opencode/src/server/server.ts:575`
- `packages/opencode/src/server/server.ts:578`
- `packages/opencode/src/server/server.ts:583`

关键点：

- `App()` 返回一个 Hono 应用实例
- Hono 应用本身有 `.fetch` 方法
- 这个 `.fetch` 方法符合 Bun 需要的请求处理函数签名

所以把 `App().fetch` 交给 `Bun.serve`，本质就是：

- 网络由 Bun 负责
- 路由/中间件/业务逻辑由 Hono 负责

## 4) OpenCode 的启动链路（你可以对照代码）

1. CLI 注册 `serve` 命令：`packages/opencode/src/index.ts`
2. `serve` 命令执行时调用 `Server.listen`：`packages/opencode/src/cli/cmd/serve.ts:15`
3. `Server.listen` 里 `Bun.serve({ fetch: App().fetch })`：`packages/opencode/src/server/server.ts:575`

也就是说，`serve.ts` 并不处理具体业务，它只是把服务器“拉起来”。

## 5) 端口到底怎么定

网络参数默认在 `packages/opencode/src/cli/network.ts:4`。

- 默认 `port = 0`
- 在 `Server.listen` 中，`port=0` 时会先尝试 `4096`，失败再让系统分配随机端口（`packages/opencode/src/server/server.ts:588`）

所以你看到日志里端口变化是正常的，不是异常。

## 6) `fetch` 每次请求都会走一遍吗

是。每个请求都会进入 `App().fetch`。

但 `App()` 本身是懒加载缓存，不会每次都重建路由树：

- `packages/opencode/src/server/server.ts:58`
- `packages/opencode/src/util/lazy.ts:1`

可以理解为：

- 第一次请求：构建 Hono 应用（成本较高）
- 后续请求：复用同一个应用实例（成本较低）

## 7) 你可以用这个心智模型记住它

```txt
TCP/HTTP 连接（Bun）
  -> Bun.serve 收到请求
  -> 调用 fetch(req)
  -> fetch 实际是 Hono App().fetch
  -> Hono 执行中间件和路由
  -> 生成 Response
  -> Bun 回写给客户端
```

## 8) 最小自测命令

在 OpenCode 仓库根目录：

```bash
# 启动服务（示例）
bun run --cwd packages/opencode src/index.ts serve --port 43120

# 健康检查（验证 fetch 管道通）
curl -s http://127.0.0.1:43120/global/health
```

如果返回 JSON，说明链路已经打通。

---

读完这篇后，你可以继续看：

- `docs/09-development-guide/hono-from-zero.md`
- `docs/09-development-guide/opencode-serve-request-lifecycle.md`
