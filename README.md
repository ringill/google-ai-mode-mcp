<div align="center">

# Google AI Mode MCP Server

**MCP server for Google AI Search Mode with CAPTCHA handling.**

Fork of [PleasePrompto/google-ai-mode-mcp](https://github.com/PleasePrompto/google-ai-mode-mcp) with **custom browser support**.

</div>

---

## What's Different in This Fork

### 🌐 Custom Browser Support

Use Brave, Edge, or any Chromium-based browser instead of Chrome.

**Set via `.env`:**
```bash
GOOGLE_AI_BROWSER_PATH=C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe
```

**Or in MCP config:**
```json
{
  "mcpServers": {
    "google-ai-search": {
      "command": "node",
      "args": ["C:\\Users\\ringill\\repo\\google-ai-mode-mcp\\dist\\index.js"],
      "env": {
        "GOOGLE_AI_BROWSER_PATH": "C:\\\\Program Files\\\\BraveSoftware\\\\Brave-Browser\\\\Application\\\\brave.exe",
        "GOOGLE_AI_PROFILE_DIR": "C:\\\\Users\\\\ringill\\\\AppData\\\\Local\\\\BraveSoftware\\\\Brave-Browser\\\\User Data\\\\MCPProfile"
      }
    }
  }
}
```

### 📁 Custom Profile Support

Use existing browser profile to avoid CAPTCHA:

```bash
GOOGLE_AI_PROFILE_DIR=C:\\Users\\ringill\\AppData\\Local\\BraveSoftware\\Brave-Browser\\User Data\\MCPProfile
```

---

## Usage

The server exposes a single MCP tool: **`search_ai`**. An agent (Claude, Cursor, etc.)
calls it to run a Google AI Mode search and get back a markdown summary with citations.

### Text-only search

```json
{ "query": "FastAPI tutorial 2026 (routing, async, testing). Provide examples." }
```

### Image / multimodal search

Pass an `image_path` alongside the query to attach a local image. The query is an
**instruction** to the model about the image; the file is the visual input.

```json
{
  "query": "What is in this image - describe every element in detail",
  "image_path": "C:\\Users\\ringill\\repo\\project\\screenshot.png"
}
```

Rules for `image_path`:
- Must be an **absolute** path to a local image (PNG / JPG / WebP). Relative paths and URLs are not supported.
- Use it only when the user explicitly refers to / provides an image. Omit it for pure text questions.
- Works with any browser configured via `GOOGLE_AI_BROWSER_PATH` (Brave, Edge, ...).

### Parameters

| Parameter     | Type    | Default   | Description                                            |
|---------------|---------|-----------|--------------------------------------------------------|
| `query`       | string  | required  | Text query or instruction for the image                |
| `image_path`  | string  | —         | Absolute path to a local image to attach (multimodal)  |
| `headless`    | boolean | `true`    | `false` to watch the browser / solve CAPTCHA visually  |
| `timeout_ms`  | number  | `120000`  | Search timeout in ms (2 min)                           |
| `save_to_file`| boolean | `false`   | Save markdown result to `results/` folder              |
| `filename`    | string  | auto      | Custom filename (only used if `save_to_file: true`)    |

---

## Installation

```bash
git clone https://github.com/ringill/google-ai-mode-mcp.git
cd google-ai-mode-mcp
npm ci
```

Add to your MCP client config (see example above).

---

## All Environment Variables

| Variable                 | Default | Description               |
|--------------------------|---------|---------------------------|
| `GOOGLE_AI_BROWSER_PATH` | `null`  | Custom browser executable |
| `GOOGLE_AI_PROFILE_DIR`  | auto    | Custom profile directory  |
| `GOOGLE_AI_HEADLESS`     | `true`  | Run headless              |

See `.env.example` for full list.

---

## Credits

Original: [PleasePrompto/google-ai-mode-mcp](https://github.com/PleasePrompto/google-ai-mode-mcp)
