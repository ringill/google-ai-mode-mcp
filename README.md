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
