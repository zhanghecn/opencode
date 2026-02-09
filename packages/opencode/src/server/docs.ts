export namespace Docs {
  export function page(path: string) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OpenCode API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body {
        margin: 0;
        background: #0b0c0f;
      }
      .topbar {
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="opencode-docs-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: ${JSON.stringify(path)},
        dom_id: "#opencode-docs-ui",
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
      })
    </script>
  </body>
</html>`
  }
}
