import "@/index.css"
import { ErrorBoundary, Show, lazy, type ParentProps, createMemo, Suspense, createEffect } from "solid-js"
import { Router, Route, Navigate, useNavigate } from "@solidjs/router"
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
import { DataProvider } from "@opencode-ai/ui/context"
import type { QuestionAnswer } from "@opencode-ai/sdk/v2"

// Import from @opencode-ai/app (exported modules)
import { PlatformProvider, type Platform, AppBaseProviders } from "@opencode-ai/app"

// Local context
import { ServerProvider, useServer } from "@/context/server-fixed"
import { DocumentProcessorProvider } from "@/context/document-processor"
import { GlobalSDKProvider, useGlobalSDK, GlobalSyncProvider, useGlobalSync } from "@/context/global"
import SimplifiedLayout from "@/components/simplified-layout"

// Lazy load session from app
const SessionPage = lazy(() => import("@/pages/session"))
const Loading = () => <div class="size-full flex items-center justify-center">Loading...</div>

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
                  <I18nProvider value={{ locale: () => "en", t: (key: string) => key }}>
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
  const server = useServer()

  return (
    <Router root={(routerProps) => <SimplifiedLayout>{routerProps.children}</SimplifiedLayout>}>
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
      <h1 class="text-xl font-bold text-color-danger">Something went wrong</h1>
      <p class="text-color-secondary">{props.error.message}</p>
      <button
        onClick={() => window.location.reload()}
        class="px-4 py-2 bg-background-secondary rounded hover:bg-background-tertiary"
      >
        Reload
      </button>
    </div>
  )
}
