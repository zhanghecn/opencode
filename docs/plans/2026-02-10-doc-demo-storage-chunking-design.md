# Doc Demo Storage Chunking Design

**Context:** The doc demo writes parsed markdown and images by sending shell commands through the session API. Large markdown strings or base64 image payloads exceed the OS argument limit, causing `E2BIG` failures when `spawn` tries to run a single oversized command.

**Options:**
1) **Chunked shell writes**: split long strings into small segments, append with `printf %s`, and decode base64 from a temporary file. Keeps the current session shell API and directory layout.
2) **Add a file-write endpoint to the SDK/server**: would enable streaming binary writes, but requires server changes and new permissions.
3) **Upload temporary files from the client**: avoid large shell commands but adds upload plumbing and deviates from the current design.

**Decision:** Option 1 is the smallest change and stays within the current architecture, so it is recommended.

**Design:** Add a `chunk` helper that returns a list of string segments (default 16k) and use it to build small shell write commands. A `writeText` helper will truncate the target file and append each chunk with `printf %s`, keeping each command below a safe size. For images, base64-encode the data, write it in chunks to a `.b64` temporary file, then run `base64 --decode` to produce the binary file and remove the temp file. `store` will run these commands sequentially using the existing session shell to preserve ordering and avoid parallel writes. This approach keeps the `.doc-demo/parsed/<name>-<timestamp>` directory structure, preserves markdown content, and prevents `spawn` argument overflows without introducing new dependencies or server changes.
