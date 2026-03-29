<div align="center">

# Google AI Mode MCP Server

**MCP server for Google AI Search Mode with CAPTCHA handling.** Free, token-efficient web research with source citations.

This is a fork of [PleasePrompto/google-ai-mode-mcp](https://github.com/PleasePrompto/google-ai-mode-mcp) with added **cookie-based authentication** to avoid CAPTCHA.

</div>

---

## Features

- **🍪 Cookie Authentication** - Pre-extract Google cookies to avoid CAPTCHA (like [deepseek4free](https://github.com/xtekky/deepseek4free))
- **🤖 AI Synthesis** - Retrieves structured answers synthesized by Google from 100+ web sources
- **📝 Citations** - Includes inline citations (e.g., [1][2][3]) and source links
- **🌍 Multi-Language** - Works in DE/EN/NL/ES/FR/IT browser locales
- **🔒 CAPTCHA Handling** - Automatic detection with visible mode switch for manual solving
- **🎭 Stealth Mode** - Anti-detection techniques enabled by default
- **💾 Result Saving** - Optional saving of results to Markdown files

---

## Quick Start

### Option 1: With Cookie Authentication (Recommended - No CAPTCHA!)

1. **Extract Google cookies** using the built-in script:

```bash
npm run extract-cookies
```

This opens a browser where you:
- Log in to your Google account
- Navigate to Google AI Search
- Solve any CAPTCHA once
- Cookies are automatically saved to `.env`

2. **Add to your MCP config** - cookies are loaded automatically from `.env`

### Option 2: Without Cookies (CAPTCHA on first use)

Just add the MCP server - you'll need to solve CAPTCHA on first use.

---

## Installation

### Claude Code

```bash
claude mcp add google-ai-search npx google-ai-mode-mcp@latest
```

### Cursor / Windsurf / Zed

Add to your MCP config file (e.g., `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "google-ai-search": {
      "command": "npx",
      "args": ["google-ai-mode-mcp@latest"]
    }
  }
}
```

### From Source

```bash
git clone https://github.com/ringill/google-ai-mode-mcp.git
cd google-ai-mode-mcp
npm install
npm run build
```

---

## Cookie Authentication (CAPTCHA-Free Operation)

### Why Use Cookies?

By default, Google AI Mode may show CAPTCHA on first use. By pre-extracting your Google authentication cookies, you can:
- ✅ Skip CAPTCHA entirely
- ✅ Run in headless mode immediately
- ✅ Faster search execution

### How to Extract Cookies

#### Method 1: Automated Script (Recommended)

```bash
npm run extract-cookies
```

This interactive script:
1. Opens a visible Chrome browser
2. Navigates to Google AI Search
3. Lets you log in and solve any CAPTCHA
4. Extracts authentication cookies
5. Saves them to your `.env` file

#### Method 2: Manual Extraction (Browser Console)

1. **Open Chrome/Edge** and log in to your Google account

2. **Navigate to Google AI Search:**
   ```
   https://www.google.com/search?udm=50&q=test
   ```

3. **Open Developer Tools:**
   - Press **F12** (or right-click → Inspect)
   - Go to **Console** tab

4. **Run this command to extract all Google cookies:**
   ```javascript
   // Copy this entire output and save it
   JSON.stringify(Object.fromEntries(
     document.cookie.split('; ').map(c => {
       const [k, v] = c.split('=');
       return [k, v];
     }).filter(([k]) => 
       /AEC|SID|NID|HSID|SSID|APISID|CONSENT|SOCS/i.test(k)
     )
   ), null, 2)
   ```

5. **Copy the output** - it will look like:
   ```json
   {
     "AEC": "AaJma5sEfCQuhZK8QXFnsCbaNE4YJMcVp-b1QvLah1edVpVQ29lLpLhMIQ",
     "SIDCC": "AKEyXzX5sMIeHz37bEwcuFcW7piB5XrUmPrxdMCnrCoObLrMTM13Ld4n4Ztizf_iYPJ_ae6P_w",
     "SID": "g.a0008QjodSCuZHYt2Qb0S-JzEY2tC8sHFmFXCStEhKxpKKCKY0xYv61xiE0rkkW2_aNiFdBLkQACgYKAaYSARcSFQHGX2Mi1bDuXd1YluiohCvZS0rujBoVAUF8yKovXl33VYiIgp3nK0cC9XDk0076",
     "NID": "530=TDaV_hadp9-uPKLoYstAYeg6GTrgSXVQCErqdpju3z2zFmncYLAduswtWyOTUR8eaXL7VPNf-scWsP7ebbCHu8KclzpxRw2uqUt-J6IjzFkfy82nvX5cA-INFr6xZtgWWXnfLjcP8D1cWtRrKOLpRhzpf5Fwk63N55Cvyq1qNlM4QiO16ePuzL8zhoovt2ANarDAY0TEpjjKPrTkUY_ymP89H5lex4v3QTLRRaQnSu5r4wiqiZSeMS_xh_UFwu2OSpYx2FVqnLS1sWOeFCZBNaRLSK4rUmToO6WnP17szuGtlebbOM3OkX9-FBkug0tk5XJnpH-iMbjPqLj9qHuT_ukhuKIjWP9dNYyyMV4vCJah6dWExc5wBprfkqCaQR6CLApYv3MKQodUnux6n_2aS0F7C86VuBDejJhTkXPFODTSLDJTNroavqHImcOlBPQ5RTzglM1cp8eIC_rbng5VMQpxiFaY6cgrDIs13K37aLx_Lwhyb6SHn_hb90rAxR21_hNc7jwIcs3K9A3hUAsdUe50daED-sG-4c2wxX7cs4qOL77CdnxHpHF_tIJq3Qa21ZmJ5Kqkmlk9A1g5xQ-qLdLCdBgknzL6ztuelB8wzHlW46oUcljpCJ9uXCFdhVqdE4KTrKS2jxGqctNGC4tiODCDmow56hc1_RZbWEYCveMI5MW3nmDMmYkoC1qrjKIVUe4Q_2sdbOQdf6xYjdR1eHzq5ASKVWysCq2tXpWpEQjAdHN04Uig2QY",
     ...
   }
   ```

6. **Add to your `.env` file:**

   **Option A - JSON format:**
   ```bash
   GOOGLE_AI_COOKIES={"AEC":"your_aec_value","SIDCC":"your_sidcc_value","SID":"your_sid_value","NID":"your_nid_value"}
   ```

   **Option B - Key=value format (one per line or semicolon separated):**
   ```bash
   GOOGLE_AI_COOKIES=AEC=your_aec_value; SIDCC=your_sidcc_value; SID=your_sid_value; NID=your_nid_value
   ```

#### Method 3: Manual Extraction (DevTools UI)

1. **Open Chrome/Edge** and log in to your Google account

2. **Navigate to Google AI Search:**
   ```
   https://www.google.com/search?udm=50&q=test
   ```

3. **Open Developer Tools:**
   - Press **F12**
   - Go to **Application** tab → **Cookies** → `https://www.google.com`

4. **Copy the following cookies** (click each and copy the "Value"):

   | Cookie Name | Required | Description |
   |-------------|----------|-------------|
   | `AEC`       | ✅ Yes   | Auth Encrypted Cookie |
   | `SIDCC`     | ✅ Yes   | Session ID Cookie |
   | `SID`       | ✅ Yes   | Google Session ID |
   | `NID`       | ✅ Yes   | Google Preferences |
   | `HSID`      | Optional | HTTP Session ID |
   | `SSID`      | Optional | Secure Session ID |
   | `APISID`    | Optional | API Session ID |
   | `SAPISID`   | Optional | Secure API Session ID |
   | `1P_JAR`    | Optional | Google Settings |
   | `CONSENT`   | Optional | Consent Status |
   | `SOCS`      | Optional | SOCS Cookie |

5. **Add to your `.env` file** (same formats as Method 2)

---

#### Method 4: Alternative Console Commands

You can also extract individual cookies with these console commands:

```javascript
// Extract specific cookie
document.cookie.split('; ').find(c => c.startsWith('AEC='))?.split('=')[1]

// Extract all cookies as key=value string (for .env)
document.cookie.split('; ').map(c => c.trim()).join('; ')

// Extract only Google auth cookies as key=value
document.cookie.split('; ').filter(c => 
  /AEC|SID|NID|HSID|SSID|APISID|CONSENT|SOCS/i.test(c.split('=')[0])
).map(c => c.trim()).join('; ')
```

---

### Cookie Expiration

Google cookies expire periodically (typically every few weeks). If CAPTCHA reappears, simply re-run:

```bash
npm run extract-cookies
```

---

## Usage

### Natural Language Prompts

Ask your agent directly:
- "Search Google AI Mode for: Next.js 15 App Router best practices"
- "Research React Server Components and save the results"
- "Search for TypeScript 5.4 features and save it"

### Tool Parameters (JSON)

The server exposes the tool `search_ai`.

**Basic Search:**
```json
{ "query": "Rust async patterns 2026" }
```

**Save to File:**
```json
{ "query": "Next.js 15 features", "save_to_file": true, "filename": "nextjs-15-guide" }
```

**Visible Browser (for CAPTCHA/Debugging):**
```json
{ "query": "PostgreSQL optimization", "headless": false }
```

### File Save Locations

- **Windows:** `%LOCALAPPDATA%\google-ai-mode-mcp\results\`
- **Linux:** `~/.local/share/google-ai-mode-mcp/results/`
- **macOS:** `~/Library/Application Support/google-ai-mode-mcp/results/`

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_AI_COOKIES` | `null` | **Pre-extracted Google cookies (JSON or key=value)** |
| `GOOGLE_AI_HEADLESS` | `true` | Run browser invisibly |
| `GOOGLE_AI_STEALTH_ENABLED` | `true` | Use anti-detection techniques |
| `GOOGLE_AI_RESPONSE_TIMEOUT` | `30000` | Timeout for AI response (ms) |
| `GOOGLE_AI_CAPTCHA_TIMEOUT` | `300000` | Timeout to solve CAPTCHA (ms) |
| `GOOGLE_AI_CAPTCHA_POLL_INTERVAL` | `3000` | Interval to check CAPTCHA solution (ms) |
| `GOOGLE_AI_CAPTCHA_MAX_CONSECUTIVE` | `3` | Restart after consecutive CAPTCHAs |
| `GOOGLE_AI_CAPTCHA_COOLDOWN_MS` | `30000` | Cooldown between retries (ms) |

See `.env.example` for full list.

---

## Troubleshooting

### Repeated CAPTCHAs

**Solution:** Use cookie authentication:
```bash
npm run extract-cookies
```

### Wrong Language

Clear the browser profile:
- **Windows:** `rmdir /s "%LOCALAPPDATA%\google-ai-mode-mcp\chrome_profile"`
- **Linux/macOS:** `rm -rf ~/.local/share/google-ai-mode-mcp/chrome_profile`

### Missing Citations

Update to the latest version:
```bash
npm update -g google-ai-mode-mcp
```

### Browser Won't Launch (Linux/WSL)

Install Xvfb:
```bash
sudo apt-get install xvfb
```

Then use in MCP config:
```json
{
  "mcpServers": {
    "google-ai-search": {
      "command": "xvfb-run",
      "args": ["-a", "npx", "google-ai-mode-mcp@latest"]
    }
  }
}
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run watch

# Dev mode
npm run dev

# Extract cookies (for CAPTCHA-free operation)
npm run extract-cookies
```

---

## License

MIT License

---

## Credits

- Original project: [PleasePrompto/google-ai-mode-mcp](https://github.com/PleasePrompto/google-ai-mode-mcp)
- Cookie authentication inspired by [xtekky/deepseek4free](https://github.com/xtekky/deepseek4free)
