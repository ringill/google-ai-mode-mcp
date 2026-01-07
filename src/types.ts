/**
 * Type definitions for Google AI Search Mode MCP Server
 */

/**
 * Search result returned by the MCP tool
 */
export interface SearchResult {
  success: boolean;
  markdown: string;
  sources: Source[];
  query: string;
  captchaRequired?: boolean;
  captchaSolved?: boolean;
  error?: string;
  savedTo?: string; // Path to saved file (if save_to_file was true)
  saveError?: string; // Error message if saving failed
}

/**
 * Source information extracted from Google AI search
 */
export interface Source {
  title: string;
  url: string;
  domain: string;
}

/**
 * Citation information with position and source mapping
 */
export interface Citation {
  index: number;
  marker: string; // e.g., "[CITE-1]"
  source?: Source;
}

/**
 * CAPTCHA state tracking
 */
export interface CaptchaState {
  detected: boolean;
  url: string;
  attempts: number;
  solved: boolean;
  reason?: string; // URL, Text, or Length
}

/**
 * Search options that can be passed to the search handler
 */
export interface SearchOptions {
  headless?: boolean;
  timeout_ms?: number;
}

/**
 * Progress callback function type for MCP progress notifications
 */
export type ProgressCallback = (
  message: string,
  progress?: number,
  total?: number
) => Promise<void>;
