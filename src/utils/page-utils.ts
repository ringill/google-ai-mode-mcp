/**
 * Page utilities for DOM polling and element waiting
 * Simplified version for Google AI Search Mode
 */

import type { Page } from "patchright";
import { log } from "./logger.js";

/**
 * Wait for an element to appear on the page
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout: number = 30000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, {
      state: "visible",
      timeout,
    });
    return true;
  } catch (error) {
    log.warning(`Element not found: ${selector}`);
    return false;
  }
}

/**
 * Wait for specific text to appear on the page
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout: number = 30000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const bodyText = await page.textContent("body");
      if (bodyText && bodyText.includes(text)) {
        return true;
      }
    } catch (error) {
      // Continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Poll page state until condition is met or timeout
 */
export async function pollPageState(
  _page: Page,
  condition: () => Promise<boolean>,
  timeout: number = 30000,
  interval: number = 1000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      log.dim(`Poll error: ${error}`);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return false;
}

/**
 * Get page text content safely
 */
export async function getPageText(page: Page): Promise<string> {
  try {
    const text = await page.textContent("body");
    return text || "";
  } catch (error) {
    log.error(`Failed to get page text: ${error}`);
    return "";
  }
}

/**
 * Check if page has loaded completely
 */
export async function isPageLoaded(page: Page): Promise<boolean> {
  try {
    const readyState = await page.evaluate(() => (document as any).readyState);
    return readyState === "complete";
  } catch (error) {
    return false;
  }
}
