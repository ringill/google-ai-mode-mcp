/**
 * Response Parser for Google AI Search Mode
 *
 * Extracts AI response HTML and citations from Google search pages
 * Based on 011_network_intercept.py
 */

import type { Page } from "patchright";
import type { Citation, Source } from "../types.js";
import { log } from "../utils/logger.js";
import { CONFIG } from "../config.js";
import { CitationExtractionError } from "../errors.js";

// DOM selectors
const MAIN_CONTAINER = '[data-container-id="main-col"]';

// Citation button selectors (English, since browser is set to en-US)
const CITATION_BUTTON_SELECTORS = [
  '[aria-label*="Related links"]', // English (primary)
  'button[aria-label*="Sources"]', // Generic fallback
  '[aria-label*="Zugehörige Links"]', // German fallback (in case locale fails)
];

// Google domains to filter out
const GOOGLE_DOMAINS = [
  "google.com",
  "google.de",
  "google.co.uk",
  "googleapis.com",
  "googleusercontent.com",
  "gstatic.com",
];

export class ResponseParser {
  /**
   * Extract AI response HTML and citations from the page
   */
  async extractAiResponse(
    page: Page
  ): Promise<{ html: string; citations: Citation[] }> {
    try {
      log.info("📝 Extracting AI response...");

      // Wait for main container to be visible
      try {
        await page.waitForSelector(MAIN_CONTAINER, {
          state: "visible",
          timeout: CONFIG.responseTimeout,
        });
      } catch (error) {
        // Debug: Take screenshot to see what Google shows
        log.error("Main container not found - taking debug screenshot...");
        await page.screenshot({ path: "/tmp/google-ai-debug.png", fullPage: true });
        log.error("Screenshot saved to: /tmp/google-ai-debug.png");
        throw error;
      }

      // Inject citation markers
      const citations = await this.injectCitationMarkers(page);
      log.success(`   Found ${citations.length} citations`);

      // Click source buttons to load sidebar
      if (citations.length > 0) {
        await this.clickSourceButtons(page);
      }

      // Extract HTML from main container
      const html = await page.$eval(MAIN_CONTAINER, (el) => el.innerHTML);

      if (!html || html.trim().length === 0) {
        throw new CitationExtractionError("No AI response HTML found");
      }

      log.success(`✅ AI response extracted (${html.length} chars)`);

      return { html, citations };
    } catch (error) {
      log.error(`Failed to extract AI response: ${error}`);
      throw new CitationExtractionError(`Extraction failed: ${error}`);
    }
  }

  /**
   * Inject citation markers into the page
   * Returns array of citations with markers
   */
  async injectCitationMarkers(page: Page): Promise<Citation[]> {
    try {
      const citations = await page.evaluate((selectors) => {
        const citationsArray: { index: number; marker: string }[] = [];

        // Try each selector until we find citation buttons
        for (const selector of selectors) {
          const buttons = Array.from(document.querySelectorAll(selector));

          if (buttons.length > 0) {
            buttons.forEach((button, index) => {
              const marker = `[CITE-${index + 1}]`;
              const markerSpan = (document as any).createElement("span");
              markerSpan.textContent = marker;
              markerSpan.className = "citation-marker";

              // Insert marker after the button
              (button as any).parentNode?.insertBefore(
                markerSpan,
                (button as any).nextSibling
              );

              citationsArray.push({
                index: index + 1,
                marker,
              });
            });

            break; // Found buttons, stop trying other selectors
          }
        }

        return citationsArray;
      }, CITATION_BUTTON_SELECTORS);

      log.info(`   Injected ${citations.length} citation markers`);
      return citations;
    } catch (error) {
      log.warning(`Failed to inject citation markers: ${error}`);
      return [];
    }
  }

  /**
   * Click all source buttons to load the sidebar
   */
  async clickSourceButtons(page: Page): Promise<void> {
    try {
      log.info("   Clicking source buttons...");

      // Find citation buttons
      let buttons: any[] = [];

      for (const selector of CITATION_BUTTON_SELECTORS) {
        buttons = await page.$$(selector);
        if (buttons.length > 0) {
          log.info(`   Found ${buttons.length} buttons with selector: ${selector}`);
          break;
        }
      }

      if (buttons.length === 0) {
        log.warning("   No citation buttons found");
        return;
      }

      // Click each button with delay
      for (let i = 0; i < buttons.length; i++) {
        try {
          await buttons[i].click();
          await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay
        } catch (error) {
          log.warning(`   Failed to click button ${i + 1}: ${error}`);
        }
      }

      log.success(`   ✅ Clicked ${buttons.length} source buttons`);
    } catch (error) {
      log.warning(`Failed to click source buttons: ${error}`);
    }
  }

  /**
   * Extract sources from the sidebar
   */
  async extractSourcesFromSidebar(page: Page): Promise<Source[]> {
    try {
      log.info("   Extracting sources from sidebar...");

      // Wait for sidebar to update
      await new Promise((resolve) => setTimeout(resolve, 500));

      const sources = await page.evaluate((googleDomains) => {
        const sourcesList: { title: string; url: string; domain: string }[] =
          [];
        const seenUrls = new Set<string>();

        // Find sidebar container
        const sidebar = (document as any).querySelector('[data-container-id="rhs-col"]');
        if (!sidebar) {
          return sourcesList;
        }

        // Extract all links from sidebar
        const links = Array.from(sidebar.querySelectorAll("a[href]"));

        for (const link of links) {
          const url = (link as any).href;
          const title =
            (link as any).textContent?.trim() || (link as any).href;

          // Skip empty URLs
          if (!url || url === "#") {
            continue;
          }

          // Skip Google domains
          try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            if (googleDomains.some((gd: string) => domain.includes(gd))) {
              continue;
            }

            // Skip duplicates
            if (seenUrls.has(url)) {
              continue;
            }

            seenUrls.add(url);
            sourcesList.push({
              title,
              url,
              domain,
            });
          } catch (error) {
            // Invalid URL, skip
            continue;
          }
        }

        return sourcesList;
      }, GOOGLE_DOMAINS);

      log.success(`   ✅ Extracted ${sources.length} sources`);
      return sources;
    } catch (error) {
      log.warning(`Failed to extract sources: ${error}`);
      return [];
    }
  }
}
