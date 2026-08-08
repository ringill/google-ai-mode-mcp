/**
 * MCP Tool Definition for Google AI Search
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const SEARCH_AI_TOOL: Tool = {
  name: "search_ai",
  description: `Search Google AI Mode (udm=50) and return an AI-generated summary with citations. Supports both text-only and multimodal (image + text) queries.

Returns markdown-formatted AI response with inline citations [1][2] and source list.

Features:
- Automatic CAPTCHA detection and handling
- Source extraction with citations
- Clean markdown formatting
- Stealth mode for anti-detection
- Optional file saving with timestamp and sanitized filename

## How to use

### Text-only search
Pass only the "query" string. Example: { "query": "FastAPI tutorial 2026" }

### Multimodal (image) search
Pass "image_path" together with "query" when the user wants the AI to analyze or
describe a specific image (screenshot, photo, diagram, chart, game screenshot, ...).

Correct usage of image_path:
- Always pass an ABSOLUTE path to a local image file (PNG/JPG/WebP). Relative paths
  and URLs are NOT supported.
- The image is uploaded together with the query text. Write the query as an
  INSTRUCTION to the model about the image, e.g.:
    - "What is in this image - describe every element in detail"
    - "Transcribe the text in this screenshot"
  The query is the instruction; image_path is the visual input.
- Use it ONLY when the user explicitly provides/refers to an image. For pure text
  questions omit image_path entirely.

### Parameters
- headless: boolean, default true. Set to false to watch the browser, or to solve a
  detected CAPTCHA in a visible window.
- timeout_ms: number, default 120000 (2 min). Increase for slow networks or large
  images.
- save_to_file + filename: optional, saves the markdown result to the results/
  folder.

Note: If CAPTCHA is detected, you will be prompted to solve it in a visible browser window.`,

  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to send to Google AI Mode",
      },
      image_path: {
        type: "string",
        description:
          "Optional: Absolute path to an image file to attach to the query (multimodal search). The image is uploaded to AI Mode together with the query text.",
      },
      headless: {
        type: "boolean",
        description:
          "Optional: Run browser in headless mode (default: true). Set to false to see the browser.",
      },
      timeout_ms: {
        type: "number",
        description:
          "Optional: Timeout in milliseconds for the search (default: 120000 = 2 minutes)",
      },
      save_to_file: {
        type: "boolean",
        description:
          "Optional: Save markdown result to file (default: false). Saves to results/ folder with timestamp.",
      },
      filename: {
        type: "string",
        description:
          "Optional: Custom filename for saved result (only used if save_to_file is true). If not provided, auto-generates from query and timestamp.",
      },
    },
    required: ["query"],
  },
};
