/**
 * Browser Manager for Google AI Search Mode
 *
 * Manages a single persistent browser context for all searches.
 * Simplified version - no authentication, no session pooling.
 */

import type { BrowserContext, Page } from "patchright";
import { chromium } from "patchright";
import { CONFIG, VIEWPORT_SIZES } from "../config.js";
import { log } from "../utils/logger.js";

// Browser arguments for stealth mode
const BROWSER_ARGS = [
  "--disable-blink-features=AutomationControlled",
  "--disable-dev-shm-usage",
  "--no-sandbox",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-infobars",
  "--disable-notifications",
  "--disable-popup-blocking",
  "--lang=en-US", // Set browser language to English
];

export class BrowserManager {
  private context: BrowserContext | null = null;
  private currentHeadlessMode: boolean | null = null;
  private consecutiveCaptchas: number = 0;

  constructor() {
    log.info("🌐 BrowserManager initialized");
    log.info(`  Chrome Profile: ${CONFIG.browserProfileDir}`);
  }

  /**
   * Get or create the browser context
   */
  async getOrCreateContext(headless?: boolean): Promise<BrowserContext> {
    // Check if headless mode needs to be changed
    if (this.needsHeadlessModeChange(headless)) {
      log.warning("🔄 Headless mode change - recreating context...");
      await this.closeContext();
    }

    // Check if context needs recreation
    if (await this.needsRecreation()) {
      await this.recreateContext(headless);
    } else {
      log.success("♻️  Reusing existing context");
    }

    return this.context!;
  }

  /**
   * Check if headless mode needs to change
   */
  private needsHeadlessModeChange(headless?: boolean): boolean {
    if (headless === undefined || this.currentHeadlessMode === null) {
      return false;
    }
    return this.currentHeadlessMode !== headless;
  }

  /**
   * Check if context needs recreation
   */
  private async needsRecreation(): Promise<boolean> {
    if (!this.context) {
      return true;
    }

    try {
      await this.context.cookies();
      return false;
    } catch (error) {
      log.warning("  ⚠️  Context closed - will recreate");
      this.context = null;
      this.currentHeadlessMode = null;
      return true;
    }
  }

  /**
   * Create or recreate the browser context
   */
  private async recreateContext(headless?: boolean): Promise<void> {
    // Close old context if exists
    if (this.context) {
      try {
        await this.context.close();
      } catch (error) {
        log.warning(`Error closing context: ${error}`);
      }
    }

    // Determine headless mode
    const shouldBeHeadless = headless !== undefined ? headless : CONFIG.headless;

    // Platform-aware DISPLAY check (Linux only)
    // Windows/Mac have native display servers and don't need DISPLAY variable
    if (!shouldBeHeadless && process.platform === 'linux' && !process.env.DISPLAY) {
      throw new Error(`❌ Cannot start visible browser: No X-Server detected ($DISPLAY not set)

This commonly occurs in:
- Codex AI editor (Linux/WSL)
- Docker containers
- SSH sessions without X11 forwarding

Solution for Codex (Linux/WSL):
Add xvfb-run wrapper in your MCP config:

{
  "mcpServers": {
    "google-ai-search": {
      "command": "xvfb-run",
      "args": ["-a", "npx", "google-ai-mode-mcp@latest"]
    }
  }
}

Install xvfb if needed: sudo apt-get install xvfb

Alternative: Use headless mode (set headless: true in tool parameters)`);
    }

    this.currentHeadlessMode = shouldBeHeadless;

    // Use random viewport for anti-detection
    const viewport =
      VIEWPORT_SIZES[Math.floor(Math.random() * VIEWPORT_SIZES.length)];

    log.info(`  🚀 Launching browser (${shouldBeHeadless ? "headless" : "visible"})`);
    log.info(`  📐 Viewport: ${viewport.width}x${viewport.height}`);

    try {
      this.context = await chromium.launchPersistentContext(
        CONFIG.browserProfileDir,
        {
          channel: "chrome",
          headless: shouldBeHeadless,
          viewport,
          ignoreDefaultArgs: ["--enable-automation"],
          args: BROWSER_ARGS,
          // Add user agent for better stealth
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          // Set browser locale to English
          locale: "en-US",
          // Set Accept-Language header to English
          extraHTTPHeaders: {
            "Accept-Language": "en-US,en;q=0.9",
          },
        }
      );

      log.success("✅ Browser context created");
    } catch (error) {
      log.error(`Failed to create browser context: ${error}`);
      throw error;
    }
  }

  /**
   * Close the browser context
   */
  async closeContext(): Promise<void> {
    if (this.context) {
      try {
        log.info("🗑️  Closing browser context...");
        await this.context.close();
        this.context = null;
        this.currentHeadlessMode = null;
        log.success("✅ Browser context closed");
      } catch (error) {
        log.error(`Error closing context: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Switch to visible mode (for CAPTCHA solving)
   */
  async switchToVisibleMode(): Promise<void> {
    if (this.currentHeadlessMode === false) {
      log.info("Already in visible mode");
      return;
    }

    log.info("👁️  Switching to VISIBLE mode for CAPTCHA...");
    await this.getOrCreateContext(false); // headless=false
  }

  /**
   * Switch to headless mode
   */
  async switchToHeadlessMode(): Promise<void> {
    if (this.currentHeadlessMode === true) {
      log.info("Already in headless mode");
      return;
    }

    log.info("🔒 Switching to HEADLESS mode...");
    await this.getOrCreateContext(true); // headless=true
  }

  /**
   * Restart browser with fresh profile (for consecutive CAPTCHAs)
   */
  async restartBrowser(reason: string): Promise<void> {
    log.warning(`🔄 Restarting browser (${reason})...`);

    await this.closeContext();

    // Wait for cooldown
    log.info(`⏸️  Cooldown: ${CONFIG.captchaCooldownMs}ms...`);
    await new Promise((resolve) =>
      setTimeout(resolve, CONFIG.captchaCooldownMs)
    );

    // Recreate with random viewport
    await this.recreateContext();

    log.success("✅ Browser restarted");
  }

  /**
   * Record CAPTCHA occurrence and check if browser restart is needed
   */
  recordCaptcha(): boolean {
    this.consecutiveCaptchas++;
    log.warning(`⚠️  Consecutive CAPTCHAs: ${this.consecutiveCaptchas}`);

    if (this.consecutiveCaptchas >= CONFIG.captchaMaxConsecutive) {
      log.warning("🚨 Max consecutive CAPTCHAs reached - browser restart needed");
      return true;
    }

    return false;
  }

  /**
   * Reset consecutive CAPTCHA counter (after successful search)
   */
  resetCaptchaCounter(): void {
    if (this.consecutiveCaptchas > 0) {
      log.success(`✅ Resetting CAPTCHA counter (was ${this.consecutiveCaptchas})`);
      this.consecutiveCaptchas = 0;
    }
  }

  /**
   * Create a new page in the current context
   */
  async createPage(): Promise<Page> {
    const context = await this.getOrCreateContext();
    const page = await context.newPage();
    return page;
  }

  /**
   * Get current headless mode
   */
  isHeadless(): boolean {
    return this.currentHeadlessMode === true;
  }
}
