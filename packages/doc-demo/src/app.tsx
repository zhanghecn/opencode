import "@/index.css"
import { ErrorBoundary, Show, Suspense, lazy } from "solid-js"
import { Navigate, Route, Router } from "@solidjs/router"
import { MetaProvider } from "@solidjs/meta"
import { Font } from "@opencode-ai/ui/font"
import { MarkedProvider } from "@opencode-ai/ui/context/marked"
import { DiffComponentProvider } from "@opencode-ai/ui/context/diff"
import { CodeComponentProvider } from "@opencode-ai/ui/context/code"
import { I18nProvider } from "@opencode-ai/ui/context"
import { Diff } from "@opencode-ai/ui/diff"
import { Code } from "@opencode-ai/ui/code"
import { ThemeProvider } from "@opencode-ai/ui/theme"
import { DialogProvider } from "@opencode-ai/ui/context/dialog"

// Local context
import { ServerProvider, useServer } from "@/context/server-fixed"
import { DocumentProcessorProvider } from "@/context/document-processor"
import { GlobalSDKProvider, GlobalSyncProvider } from "@/context/global"
import SimplifiedLayout from "@/components/simplified-layout"
import { i18n } from "@/i18n"

// Lazy load session from app
const SessionPage = lazy(() => import("@/pages/session"))
const Loading = () => <div class="size-full flex items-center justify-center">加载中...</div>

export default function App() {
  return (
    <MetaProvider>
      <Font />
      <ThemeProvider>
        <ErrorBoundary fallback={(error) => <ErrorPage error={error} />}>
          <DialogProvider>
            <MarkedProvider>
              <DiffComponentProvider component={Diff}>
                <CodeComponentProvider component={Code}>
                  <I18nProvider value={i18n()}>
                    <ServerProvider>
                      <DocumentProcessorProvider>
                        <AppWithServer />
                      </DocumentProcessorProvider>
                    </ServerProvider>
                  </I18nProvider>
                </CodeComponentProvider>
              </DiffComponentProvider>
            </MarkedProvider>
          </DialogProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </MetaProvider>
  )
}

function AppWithServer() {
  const server = useServer()

  return (
    <Show when={server.ready()} fallback={<Loading />}>
      <GlobalSDKProvider>
        <GlobalSyncProvider>
          <AppRouter />
        </GlobalSyncProvider>
      </GlobalSDKProvider>
    </Show>
  )
}

function AppRouter() {
  return (
    <Router
      root={(routerProps) => (
        <SimplifiedLayout>{routerProps.children}</SimplifiedLayout>
      )}
    >
      <Route path="/" component={() => <Navigate href="/session" />} />
      <Route
        path="/session/:id?"
        component={() => (
          <Suspense fallback={<Loading />}>
            <SessionPage />
          </Suspense>
        )}
      />
    </Router>
  )
}

function ErrorPage(props: { error: Error }) {
  return (
    <div class="flex flex-col items-center justify-center h-screen gap-4">
      <h1 class="text-xl font-bold text-color-danger">出现问题了</h1>
      <p class="text-text-weak">{props.error.message}</p>
      <button
        onClick={() => window.location.reload()}
        class="px-4 py-2 bg-background-secondary rounded hover:bg-background-tertiary"
      >
        重新加载
      </button>
    </div>
  )
}
