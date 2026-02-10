/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENCODE_SERVER_URL: string
  readonly VITE_FIXED_DIRECTORY: string
  readonly VITE_PADDLE_API_URL: string
  readonly VITE_PADDLE_API_TOKEN: string
  readonly VITE_DOC_PARSE_API_URL: string
  readonly VITE_DOC_PARSE_API_TOKEN: string
  readonly VITE_DEFAULT_MODEL: string
  readonly VITE_DEFAULT_VARIANT: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare const __DOC_PARSE_URL__: string | undefined
