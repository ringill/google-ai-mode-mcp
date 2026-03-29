/**
 * Configuration for Google AI Search Mode MCP Server
 *
 * Config Priority (highest to lowest):
 * 1. Hardcoded Defaults (works out of the box!)
 * 2. Environment Variables (optional, for advanced users)
 * 3. Tool Parameters (passed by Claude at runtime)
 *
 * No config.json file needed - all settings via ENV or tool parameters!
 */

import envPaths from "env-paths";
import fs from "fs";
import path from "path";

// Cross-platform data paths
const paths = envPaths("google-ai-mode-mcp", { suffix: "" });

export interface Config {
  // Browser Settings
  headless: boolean;
  browserTimeout: number;
  viewport: { width: number; height: number };
  browserPath: string | null; // Optional custom browser path

  // Stealth Settings
  stealthEnabled: boolean;
  stealthRandomDelays: boolean;
  stealthHumanTyping: boolean;
  stealthMouseMovements: boolean;
  typingWpmMin: number;
  typingWpmMax: number;
  minDelayMs: number;
  maxDelayMs: number;

  // CAPTCHA Settings
  captchaTimeout: number; // in milliseconds
  captchaPollInterval: number; // in milliseconds
  captchaMaxConsecutive: number;
  captchaCooldownMs: number;

  // Search Settings
  responseTimeout: number; // in milliseconds
  citationTimeout: number; // in milliseconds

  // Paths
  dataDir: string;
  browserProfileDir: string;
}

// Common viewport sizes for anti-detection
export const VIEWPORT_SIZES = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 2560, height: 1440 },
];

/**
 * Default Configuration (works out of the box!)
 */
const DEFAULTS: Config = {
  // Browser Settings
  headless: true,
  browserTimeout: 30000, // 30 seconds
  viewport: { width: 1920, height: 1080 },
  browserPath: null, // No custom browser path by default

  // Stealth Settings
  stealthEnabled: true,
  stealthRandomDelays: true,
  stealthHumanTyping: true,
  stealthMouseMovements: true,
  typingWpmMin: 160,
  typingWpmMax: 240,
  minDelayMs: 100,
  maxDelayMs: 400,

  // CAPTCHA Settings
  captchaTimeout: 300000, // 5 minutes
  captchaPollInterval: 3000, // 3 seconds
  captchaMaxConsecutive: 3, // Restart browser after 3 consecutive CAPTCHAs
  captchaCooldownMs: 30000, // 30 seconds cooldown after restart

  // Search Settings
  responseTimeout: 30000, // 30 seconds
  citationTimeout: 5000, // 5 seconds per citation

  // Paths
  dataDir: paths.data,
  browserProfileDir: path.join(paths.data, "chrome_profile"),
};

/**
 * Parse boolean from string (for env vars)
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) return defaultValue;
  const lower = value.toLowerCase();
  if (lower === "true" || lower === "1") return true;
  if (lower === "false" || lower === "0") return false;
  return defaultValue;
}

/**
 * Parse integer from string (for env vars)
 */
function parseInteger(
  value: string | undefined,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Apply environment variable overrides
 */
function applyEnvOverrides(config: Config): Config {
  return {
    ...config,
    // Browser Settings
    browserPath: process.env.GOOGLE_AI_BROWSER_PATH || null,
    headless: parseBoolean(process.env.GOOGLE_AI_HEADLESS, config.headless),
    browserTimeout: parseInteger(
      process.env.GOOGLE_AI_BROWSER_TIMEOUT,
      config.browserTimeout
    ),

    // Stealth Settings
    stealthEnabled: parseBoolean(
      process.env.GOOGLE_AI_STEALTH_ENABLED,
      config.stealthEnabled
    ),
    stealthRandomDelays: parseBoolean(
      process.env.GOOGLE_AI_STEALTH_RANDOM_DELAYS,
      config.stealthRandomDelays
    ),
    stealthHumanTyping: parseBoolean(
      process.env.GOOGLE_AI_STEALTH_HUMAN_TYPING,
      config.stealthHumanTyping
    ),
    stealthMouseMovements: parseBoolean(
      process.env.GOOGLE_AI_STEALTH_MOUSE_MOVEMENTS,
      config.stealthMouseMovements
    ),
    typingWpmMin: parseInteger(
      process.env.GOOGLE_AI_TYPING_WPM_MIN,
      config.typingWpmMin
    ),
    typingWpmMax: parseInteger(
      process.env.GOOGLE_AI_TYPING_WPM_MAX,
      config.typingWpmMax
    ),
    minDelayMs: parseInteger(
      process.env.GOOGLE_AI_MIN_DELAY_MS,
      config.minDelayMs
    ),
    maxDelayMs: parseInteger(
      process.env.GOOGLE_AI_MAX_DELAY_MS,
      config.maxDelayMs
    ),

    // CAPTCHA Settings
    captchaTimeout: parseInteger(
      process.env.GOOGLE_AI_CAPTCHA_TIMEOUT,
      config.captchaTimeout
    ),
    captchaPollInterval: parseInteger(
      process.env.GOOGLE_AI_CAPTCHA_POLL_INTERVAL,
      config.captchaPollInterval
    ),
    captchaMaxConsecutive: parseInteger(
      process.env.GOOGLE_AI_CAPTCHA_MAX_CONSECUTIVE,
      config.captchaMaxConsecutive
    ),
    captchaCooldownMs: parseInteger(
      process.env.GOOGLE_AI_CAPTCHA_COOLDOWN_MS,
      config.captchaCooldownMs
    ),

    // Search Settings
    responseTimeout: parseInteger(
      process.env.GOOGLE_AI_RESPONSE_TIMEOUT,
      config.responseTimeout
    ),
    citationTimeout: parseInteger(
      process.env.GOOGLE_AI_CITATION_TIMEOUT,
      config.citationTimeout
    ),

    // Paths - allow override via env
    browserProfileDir:
      process.env.GOOGLE_AI_PROFILE_DIR || config.browserProfileDir,
  };
}

/**
 * Build final configuration
 */
function buildConfig(): Config {
  return applyEnvOverrides(DEFAULTS);
}

/**
 * Global configuration instance
 */
export const CONFIG: Config = buildConfig();

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [CONFIG.dataDir, CONFIG.browserProfileDir];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Browser options that can be passed via tool parameters
 */
export interface BrowserOptions {
  headless?: boolean;
  timeout_ms?: number;
}

/**
 * Apply browser options to CONFIG (returns modified copy, doesn't mutate global CONFIG)
 */
export function applyBrowserOptions(options?: BrowserOptions): Config {
  const config = { ...CONFIG };

  if (options) {
    if (options.headless !== undefined) {
      config.headless = options.headless;
    }
    if (options.timeout_ms !== undefined) {
      config.browserTimeout = options.timeout_ms;
    }
  }

  return config;
}

// Create directories on import
ensureDirectories();
