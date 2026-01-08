/**
 * CAPTCHA Detector for Google AI Search Mode
 *
 * Three-layer detection:
 * 1. URL Pattern - Check for /sorry/index
 * 2. Error Messages - Check for "unusual traffic" text
 * 3. Page Length - CAPTCHA pages are typically < 600 chars
 *
 * Based on the Python reference from pSeoTest
 */

import type { Page } from "patchright";
import type { CaptchaState } from "../types.js";
import { CONFIG } from "../config.js";
import { log } from "../utils/logger.js";
import { CaptchaTimeoutError } from "../errors.js";
import { getPageText } from "../utils/page-utils.js";
import { CAPTCHA_ERROR_MESSAGES } from "../constants/language-constants.js";

// CAPTCHA URL patterns
const CAPTCHA_URL_PATTERNS = [
  "google.com/sorry/index",
  "/sorry/index?continue=",
];

// Page length threshold
const CAPTCHA_PAGE_LENGTH_THRESHOLD = 600; // chars

export class CaptchaDetector {
  /**
   * Check if current URL matches CAPTCHA pattern
   */
  isCaptchaUrl(page: Page): boolean {
    try {
      const currentUrl = page.url();

      for (const pattern of CAPTCHA_URL_PATTERNS) {
        if (currentUrl.includes(pattern)) {
          log.warning(`🔴 CAPTCHA URL detected: ${currentUrl}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      log.error(`Error checking CAPTCHA URL: ${error}`);
      return false;
    }
  }

  /**
   * Check if page text contains CAPTCHA error messages
   */
  async detectCaptchaText(page: Page): Promise<boolean> {
    try {
      const pageText = await getPageText(page);

      for (const errorMsg of CAPTCHA_ERROR_MESSAGES) {
        if (pageText.includes(errorMsg)) {
          log.warning(`🔴 CAPTCHA text detected: "${errorMsg}"`);
          return true;
        }
      }

      return false;
    } catch (error) {
      log.error(`Error checking CAPTCHA text: ${error}`);
      return false;
    }
  }

  /**
   * Check if page length is suspiciously short (CAPTCHA indicator)
   */
  async detectCaptchaByLength(page: Page): Promise<boolean> {
    try {
      const pageText = await getPageText(page);
      const length = pageText.trim().length;

      if (length < CAPTCHA_PAGE_LENGTH_THRESHOLD) {
        log.warning(
          `🔴 CAPTCHA length detected: ${length} chars (< ${CAPTCHA_PAGE_LENGTH_THRESHOLD})`
        );
        return true;
      }

      return false;
    } catch (error) {
      log.error(`Error checking page length: ${error}`);
      return false;
    }
  }

  /**
   * Comprehensive CAPTCHA detection (three-layer)
   * Priority: URL > Text > Length
   */
  async detectCaptcha(page: Page): Promise<CaptchaState> {
    const state: CaptchaState = {
      detected: false,
      url: page.url(),
      attempts: 0,
      solved: false,
    };

    // Layer 1: URL Pattern (highest priority, fastest)
    if (this.isCaptchaUrl(page)) {
      state.detected = true;
      state.reason = "URL";
      return state;
    }

    // Layer 2: Error Message Pattern
    if (await this.detectCaptchaText(page)) {
      state.detected = true;
      state.reason = "Text";
      return state;
    }

    // Layer 3: Page Length Heuristic
    if (await this.detectCaptchaByLength(page)) {
      state.detected = true;
      state.reason = "Length";
      return state;
    }

    return state;
  }

  /**
   * Wait for CAPTCHA solution with polling
   *
   * Polls every captchaPollInterval (default 3 seconds)
   * Checks for URL change or text change indicating CAPTCHA solved
   * Returns true if solved, false if timeout
   */
  async waitForCaptchaSolution(
    page: Page,
    timeout: number = CONFIG.captchaTimeout
  ): Promise<boolean> {
    const startTime = Date.now();
    const interval = CONFIG.captchaPollInterval;
    const maxChecks = Math.floor(timeout / interval);

    log.info(`⏳ Waiting for CAPTCHA solution...`);
    log.info(`   Timeout: ${timeout / 1000}s, Polling: every ${interval / 1000}s`);

    for (let checkNum = 0; checkNum < maxChecks; checkNum++) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.floor((timeout - elapsed) / 1000);

      // Log status every 5 checks (15 seconds with 3s interval)
      if (checkNum % 5 === 0 && remaining > 0) {
        log.info(`   ⏳ Still waiting... (${remaining}s remaining)`);
      }

      // Check if URL changed (left /sorry/ page)
      if (this.isCaptchaUrl(page)) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        continue;
      }

      // URL changed - check if CAPTCHA is still detected
      const captchaState = await this.detectCaptcha(page);

      if (!captchaState.detected) {
        const solveTime = Math.floor((Date.now() - startTime) / 1000);
        log.success(`✅ CAPTCHA solved after ${solveTime}s!`);
        return true;
      }

      // Still detected, continue polling
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // Timeout reached
    const timeoutSec = timeout / 1000;
    log.error(`❌ CAPTCHA timeout after ${timeoutSec}s`);
    return false;
  }

  /**
   * Handle CAPTCHA: detect, notify, wait for solution
   *
   * This method doesn't switch browser modes - that's handled by the caller
   * Returns true if CAPTCHA was solved, throws if timeout
   */
  async handleCaptcha(page: Page): Promise<boolean> {
    const captchaState = await this.detectCaptcha(page);

    if (!captchaState.detected) {
      return true; // No CAPTCHA
    }

    log.warning("="

.repeat(80));
    log.warning("🚨 CAPTCHA DETECTED!");
    log.warning(`   Reason: ${captchaState.reason}`);
    log.warning(`   URL: ${captchaState.url}`);
    log.warning("=".repeat(80));
    log.info("⏸️  PLEASE SOLVE CAPTCHA IN VISIBLE BROWSER!");
    log.info(`   ⏳ Timeout: ${CONFIG.captchaTimeout / 1000}s`);
    log.warning("=".repeat(80));

    // Wait for solution
    const solved = await this.waitForCaptchaSolution(page);

    if (!solved) {
      throw new CaptchaTimeoutError(
        `CAPTCHA not solved within ${CONFIG.captchaTimeout / 1000}s`
      );
    }

    return true;
  }
}
