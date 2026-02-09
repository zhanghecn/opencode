# 运行入口文件索引

本页聚焦“从哪里开始调试”，把主要运行入口和启动链路集中到一页。每个入口都附带小段源码 + 中文注释，方便快速定位。
说明：代码块为关键片段摘录，省略了非关键细节。

## 总览表

| 模块              | 入口文件                                      | 触发方式                                           | 说明                               |
| ----------------- | --------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| CLI 主入口        | `packages/opencode/src/index.ts`              | `bun dev` 或 `bun run --cwd packages/opencode dev` | yargs 注册命令，默认进入 TUI       |
| CLI 二进制壳      | `packages/opencode/bin/opencode`              | `opencode`                                         | 查找平台二进制并执行               |
| TUI 线程          | `packages/opencode/src/cli/cmd/tui/thread.ts` | `opencode` / `bun dev`                             | 默认 `$0` 命令，启动 Worker 与 TUI |
| TUI Worker        | `packages/opencode/src/cli/cmd/tui/worker.ts` | 由 TUI 线程启动                                    | RPC 入口 + Server 启动入口         |
| Server 主入口     | `packages/opencode/src/server/server.ts`      | `opencode serve` 或 Worker 启动                    | Hono app + 路由注册                |
| App (Web UI)      | `packages/app/src/entry.tsx`                  | `cd packages/app && bun dev`                       | Web 端 UI 渲染入口                 |
| Desktop (WebView) | `packages/desktop/src/index.tsx`              | `cd packages/desktop && bun tauri dev`             | 桌面端 WebView 入口                |
| Desktop (Rust)    | `packages/desktop/src-tauri/src/main.rs`      | `bun tauri dev`                                    | Tauri 原生入口                     |
| Console (Client)  | `packages/console/app/src/entry-client.tsx`   | `cd packages/console/app && bun dev`               | SolidStart 客户端入口              |
| Console (Server)  | `packages/console/app/src/entry-server.tsx`   | `cd packages/console/app && bun dev`               | SolidStart 服务端入口              |
| Web (Docs)        | `packages/web/src/pages/[...slug].md.ts`      | `cd packages/web && bun dev`                       | Astro 路由入口之一                 |

## CLI / TUI / Server 入口细节

### 1) CLI 主入口：`packages/opencode/src/index.ts`

```ts
const cli = yargs(hideBin(process.argv)) // 解析命令行参数
  .scriptName("opencode") // CLI 名称
  .command(TuiThreadCommand) // 默认入口：TUI
  .command(ServeCommand) // Server 模式
  .command(RunCommand) // 单次执行模式

await cli.parse() // 执行命令解析
```

### 2) CLI 二进制壳：`packages/opencode/bin/opencode`

```js
const envPath = process.env.OPENCODE_BIN_PATH // 允许外部指定二进制路径
if (envPath) run(envPath) // 优先使用环境变量路径

const resolved = findBinary(scriptDir) // 向上查找平台二进制
run(resolved) // 交给平台二进制执行
```

### 3) TUI 线程入口：`packages/opencode/src/cli/cmd/tui/thread.ts`

```ts
const worker = new Worker(workerPath, {
  env: Object.fromEntries(Object.entries(process.env).filter((entry) => entry[1] !== undefined)),
}) // 启动 Worker 线程

const client = Rpc.client<typeof rpc>(worker) // 建立 RPC 通道
const networkOpts = await resolveNetworkOptions(args) // 解析网络参数

const tuiPromise = tui({
  url,
  fetch: customFetch,
  events,
  args: { continue: args.continue, sessionID: args.session, agent: args.agent, model: args.model, prompt },
}) // 启动 TUI UI

await tuiPromise
```

### 4) TUI Worker 入口：`packages/opencode/src/cli/cmd/tui/worker.ts`

```ts
await Log.init({
  print: process.argv.includes("--print-logs"), // 是否输出日志到 stderr
  dev: Installation.isLocal(), // 是否本地开发
  level: (() => {
    if (Installation.isLocal()) return "DEBUG"
    return "INFO"
  })(), // 动态日志级别
}) // 日志初始化

GlobalBus.on("event", (event) => {
  Rpc.emit("global.event", event)
}) // 转发全局事件给 TUI

export const rpc = {
  async fetch(input) {
    const response = await Server.App().fetch(
      new Request(input.url, { method: input.method, headers: input.headers, body: input.body }),
    )
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    }
  },
  async server(input) {
    server = Server.listen(input)
    return { url: server.url.toString() }
  },
} // Worker 暴露给 TUI 的 RPC 接口

Rpc.listen(rpc) // 开始监听 RPC
```

### 5) Server 主入口：`packages/opencode/src/server/server.ts`

```ts
const app = new Hono()

export const App: () => Hono = lazy(
  () =>
    app
      .use(cors({ origin: (input) => input }))
      .route("/session", SessionRoutes()) // 会话相关 API
      .route("/provider", ProviderRoutes()) // 提供商相关 API
      .route("/mcp", McpRoutes()), // MCP 相关 API
)
```

### 6) Serve 命令入口：`packages/opencode/src/cli/cmd/serve.ts`

```ts
const opts = await resolveNetworkOptions(args) // 解析网络参数
const server = Server.listen(opts) // 启动 HTTP Server
console.log(`opencode server listening on http://${server.hostname}:${server.port}`)
```

### CLI / TUI 启动链路（开发态）

```
terminal
  |
  | bun dev
  v
packages/opencode/src/index.ts
  | \
  |  \-- serve --> packages/opencode/src/cli/cmd/serve.ts --> packages/opencode/src/server/server.ts
  |
  +-- default ($0) --> packages/opencode/src/cli/cmd/tui/thread.ts
                          |
                          +-- Worker --> packages/opencode/src/cli/cmd/tui/worker.ts
                                         |
                                         +-- RPC fetch/events --> packages/opencode/src/cli/cmd/tui/app.tsx
```

## App / Desktop / Console / Web 入口

### App (Web UI)：`packages/app/src/entry.tsx`

```ts
const platform: Platform = {
  platform: "web", // Web 平台适配
  version: pkg.version,
  openLink(url: string) {
    window.open(url, "_blank")
  },
}

render(
  () => (
    <PlatformProvider value={platform}>
      <AppBaseProviders>
        <AppInterface />
      </AppBaseProviders>
    </PlatformProvider>
  ),
  root!,
)
```

### Desktop (WebView)：`packages/desktop/src/index.tsx`

```ts
import "./webview-zoom" // WebView 缩放兼容

void initI18n() // 初始化多语言

const createPlatform = (password) => ({
  platform: "desktop", // 桌面平台适配
  version: pkg.version,
})
```

### Desktop (Rust)：`packages/desktop/src-tauri/src/main.rs`

```rs
fn main() {
    upsert("NO_PROXY"); // 确保 localhost 不走代理
    upsert("no_proxy");
    opencode_lib::run(); // 进入 Tauri 运行时
}
```

### Console (SolidStart)：`packages/console/app/src/entry-client.tsx`

```ts
mount(() => <StartClient />, document.getElementById("app")!) // 客户端入口
```

### Console (SolidStart)：`packages/console/app/src/entry-server.tsx`

```ts
export default createHandler(
  () => (
    <StartServer document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>{assets}</head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )} />
  ),
  { mode: "async" },
) // 服务端入口
```

### Web (Astro 文档)：`packages/web/src/pages/[...slug].md.ts`

```ts
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug || "index" // 解析文档 slug
  const docs = await getCollection("docs") // 读取 docs 集合
  const doc = docs.find((d) => d.id === slug)
  if (!doc) return new Response("Not found", { status: 404 })
  return new Response(doc.body, { headers: { "Content-Type": "text/plain; charset=utf-8" } })
}
```

### 前端入口关系速览

```
packages/desktop/src-tauri/src/main.rs
  |
  v
Tauri WebView -> packages/desktop/src/index.tsx -> @opencode-ai/app (AppInterface)

packages/app/src/entry.tsx -> AppInterface -> SDK -> opencode server

packages/console/app/src/entry-server.tsx -> StartServer
packages/console/app/src/entry-client.tsx -> StartClient

packages/web/src/pages/* -> Astro file routes -> content collection
```
