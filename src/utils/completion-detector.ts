/**
 * AI Completion Detection Utility
 * 4-Stage Detection Strategy (SVG → aria-label → Text → Timeout)
 */

import type { Page } from "patchright";
import { log } from "./logger.js";
import {
  AI_COMPLETION_BUTTON_ARIA,
  AI_COMPLETION_TIMEOUT,
  OVERALL_COMPLETION_TIMEOUT,
  AI_COMPLETION_TEXT_INDICATORS,
} from "../constants/language-constants.js";

export interface CompletionResult {
  success: boolean;
  method: "svg" | "aria-label" | "text" | "timeout" | "none";
  elapsed: number;
}

/**
 * Wait for AI response to complete using 4-stage detection
 * EXACT 1:1 CLONE of Python skill logic!
 *
 * Method 1 (0-15s): SVG thumbs-up button (100% reliable, language-independent)
 * Method 2 (15-30s): aria-label feedback button (fallback)
 * Method 3 (30-40s): Text indicators (multi-language fallback)
 * Method 4 (40s): Timeout - proceed anyway
 */
export async function waitForAiCompletion(page: Page): Promise<CompletionResult> {
  const startTime = Date.now();
  const overallDeadline = startTime + OVERALL_COMPLETION_TIMEOUT; // 40 seconds total

  log.info("⏳ Waiting for AI completion...");
  log.debug("Starting hybrid completion detection...");

  let aiReady = false;

  // PRIMARY: Button-based detection (DUAL METHOD - ultra-robust!)
  // Method 1: SVG-based detection (100% reliable, language-independent!)
  let remainingTime = overallDeadline - Date.now();
  if (remainingTime > 0 && !aiReady) {
    try {
      log.debug("Method 1: Attempting SVG thumbs-up icon detection...");
      const svgSelector = 'button svg[viewBox="3 3 18 18"]'; // EXACT skill selector
      await page.waitForSelector(svgSelector, {
        timeout: Math.min(AI_COMPLETION_TIMEOUT, remainingTime),
        state: "visible",
      });

      aiReady = true;
      const elapsed = Date.now() - startTime;
      log.success("✅ Thumbs UP SVG detected!");
      log.info(`  ✅ AI complete (Thumbs UP SVG detected!) (${elapsed}ms)`);
      return { success: true, method: "svg", elapsed };

    } catch (svgError) {
      // Method 2: aria-label detection (fallback)
      log.debug(`Method 1 failed: ${svgError instanceof Error ? svgError.message : String(svgError)}`);
      remainingTime = overallDeadline - Date.now();

      if (remainingTime > 0 && !aiReady) {
        try {
          log.debug(`Method 2: Attempting aria-label detection: ${AI_COMPLETION_BUTTON_ARIA}`);
          await page.waitForSelector(AI_COMPLETION_BUTTON_ARIA, {
            timeout: Math.min(AI_COMPLETION_TIMEOUT, remainingTime),
            state: "visible",
          });

          aiReady = true;
          const elapsed = Date.now() - startTime;
          log.success("✅ AI complete via aria-label button");
          log.info(`  ✅ AI complete (button aria-label detected) (${elapsed}ms)`);
          return { success: true, method: "aria-label", elapsed };

        } catch (ariaError) {
          // Method 3: Text-based detection (multi-language fallback)
          log.debug(`Method 2 failed: ${svgError instanceof Error ? svgError.message : String(svgError)}`);
          log.debug("Both button methods failed, trying text detection...");
          log.info("⏳ Button not found, trying text detection (multi-lang)...");

          // Text fallback: Poll until overall deadline
          while (Date.now() < overallDeadline && !aiReady) {
            try {
              const bodyText = await page.evaluate(() => document.body.innerText);

              // Check ALL language indicators
              for (const indicator of AI_COMPLETION_TEXT_INDICATORS) {
                if (bodyText.includes(indicator)) {
                  aiReady = true;
                  const elapsed = Date.now() - startTime;
                  log.success(`✅ AI complete via text: "${indicator}"`);
                  log.info(`  ✅ AI complete (text detected) (${elapsed}ms)`);
                  return { success: true, method: "text", elapsed };
                }
              }
            } catch (error) {
              // Check for browser closed
              const errorMsg = error instanceof Error ? error.message : String(error);
              if (errorMsg.toLowerCase().includes("browser has been closed") || errorMsg.toLowerCase().includes("target closed")) {
                log.error("Browser closed while waiting for AI content");
                throw new Error("Browser closed while waiting for AI content");
              }
            }

            // Poll every 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }
    }
  }

  // FINAL TIMEOUT FALLBACK: After 40 seconds, proceed with whatever is loaded
  if (!aiReady) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= OVERALL_COMPLETION_TIMEOUT) {
      log.warning("⏱️  40s timeout reached - proceeding with loaded content");
      log.info(`  ⏱️  Timeout (40s) - scraping loaded content (${elapsed}ms)`);
      aiReady = true; // Proceed anyway
    } else {
      log.warning("AI completion not detected (proceeding anyway)");
      log.info("  ⚠️  No completion indicator (proceeding)");
    }
  }

  const elapsed = Date.now() - startTime;
  return { success: true, method: "timeout", elapsed };
}

/**
 * Check if AI Mode is available in the current region/language
 */
export async function checkAiModeAvailability(page: Page): Promise<boolean> {
  log.info("🌍 Checking AI Mode availability...");

  try {
    const bodyText = await page.evaluate(() => document.body.innerText);
    const { AI_MODE_NOT_AVAILABLE } = await import("../constants/language-constants.js");

    for (const indicator of AI_MODE_NOT_AVAILABLE) {
      if (bodyText.includes(indicator)) {
        log.error(`❌ AI Mode not available: "${indicator}"`);
        return false;
      }
    }

    log.debug("AI Mode available, proceeding...");
    return true;
  } catch (error) {
    log.debug(`Could not check AI Mode availability: ${error instanceof Error ? error.message : String(error)}`);
    // Proceed anyway - don't block on this check
    return true;
  }
}
