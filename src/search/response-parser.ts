/**
 * Response Parser for Google AI Search Mode
 *
 * EXACT 1:1 PORT of DOM_INJECTION_SCRIPT from Python skill!
 * Based on SERPO's proven extraction method.
 */

import type { Page } from "patchright";
import { log } from "../utils/logger.js";
import { CONFIG } from "../config.js";
import { CitationExtractionError } from "../errors.js";
import { CITATION_SELECTORS } from "../constants/language-constants.js";

// DOM selectors
const MAIN_CONTAINER = '[data-container-id="main-col"]';

export class ResponseParser {
  /**
   * Extract AI response HTML and citations from the page
   * EXACT 1:1 CLONE of Python skill's DOM_INJECTION_SCRIPT!
   */
  async extractAiResponse(
    page: Page
  ): Promise<{ html: string; citations: any[] }> {
    try {
      log.info("📚 Injecting Markers & Extracting Sources...");

      // Wait for main container to be visible
      try {
        await page.waitForSelector(MAIN_CONTAINER, {
          state: "visible",
          timeout: CONFIG.responseTimeout,
        });
      } catch (error) {
        log.error("Main container not found - AI Overview missing?");
        throw new CitationExtractionError("AI Overview container not found");
      }

      // Execute DOM injection script (1:1 clone from Python skill)
      const result = await page.evaluate((selectors) => {
        // Helper: Check if element is visually visible to user
        function isVisible(el: any): boolean {
          if (!el) return false;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0" &&
            el.offsetParent !== null &&
            rect.width > 0 &&
            rect.height > 0
          );
        }

        // Find main container
        const mainCol = document.querySelector('[data-container-id="main-col"]');
        if (!mainCol) {
          return { error: "main-col not found (AI Overview missing?)" };
        }

        // SERPO OPTIMIZATION: Expand "Show more" buttons first
        try {
          const showMoreBtns = Array.from(
            mainCol.querySelectorAll('[aria-expanded="false"]')
          );
          for (const btn of showMoreBtns) {
            const btnEl = btn as HTMLElement;
            if (
              isVisible(btnEl) &&
              (btnEl.innerText.includes("Show more") ||
                btnEl.innerText.includes("Mehr anzeigen") ||
                btnEl.innerText.includes("Meer weergeven"))
            ) {
              (btnEl as any).click();
              // Small delay for expansion
              const waitSync = (ms: number) => {
                const start = Date.now();
                while (Date.now() - start < ms) {
                  // Busy wait
                }
              };
              waitSync(200);
            }
          }
        } catch (e) {
          console.warn("Show more expansion failed", e);
        }

        // MULTI-LANGUAGE: Try citation selectors in order
        let buttons: Element[] = [];

        for (const selector of selectors) {
          buttons = Array.from(mainCol.querySelectorAll(selector));
          if (buttons.filter((b) => isVisible(b as HTMLElement)).length > 0) {
            console.log(
              `Found ${buttons.length} citation buttons with: ${selector}`
            );
            break;
          }
        }

        const allCitations: any[] = [];
        let markerIndex = 0;

        // FOR EACH BUTTON: Mark → Click → Extract (SERPO method!)
        for (const btn of buttons) {
          const btnEl = btn as HTMLElement;

          // Skip invisible "ghost" buttons in DOM
          if (!isVisible(btnEl)) continue;

          // 1. Insert visual marker [CITE-N] (SERPO: wrapped in <code> tag!)
          const markerId = markerIndex++;
          const marker = document.createElement("span");
          marker.className = "citation-marker";
          marker.innerHTML = `<code>[CITE-${markerId}]</code>`; // Code-tag wrap!

          // Place marker after button
          if (btnEl.nextSibling) {
            btnEl.parentNode?.insertBefore(marker, btnEl.nextSibling);
          } else {
            btnEl.parentNode?.appendChild(marker);
          }

          // 2. Click button to load sources in sidebar
          try {
            btnEl.scrollIntoView({ behavior: "instant", block: "center" });

            // Count visible links BEFORE click
            const countVisibleLinks = () => {
              const rhsCol = document.querySelector('[data-container-id="rhs-col"]');
              if (!rhsCol) return 0;
              return Array.from(rhsCol.querySelectorAll("a[href]")).filter((l) =>
                isVisible(l as HTMLElement)
              ).length;
            };
            const beforeCount = countVisibleLinks();

            (btnEl as any).click();

            // SMART WAIT: Wait until links change (max 300ms)
            const startTime = Date.now();
            while (Date.now() - startTime < 300) {
              // Poll every 10ms
              const waitSync = (ms: number) => {
                const start = Date.now();
                while (Date.now() - start < ms) {
                  // Busy wait
                }
              };
              waitSync(10);

              if (countVisibleLinks() !== beforeCount) break;
            }

            // Short buffer for animations
            const waitSync = (ms: number) => {
              const start = Date.now();
              while (Date.now() - start < ms) {
                // Busy wait
              }
            };
            waitSync(50);
          } catch (e) {
            console.warn("Click failed", e);
          }

          // 3. Extract sources from sidebar (rhs-col)
          const sources: any[] = [];
          const seen = new Set<string>();
          const rhsCol = document.querySelector('[data-container-id="rhs-col"]');

          if (rhsCol) {
            const links = Array.from(rhsCol.querySelectorAll("a[href]"));
            for (const link of links) {
              const linkEl = link as HTMLAnchorElement;

              if (!isVisible(linkEl)) continue;

              const url = linkEl.href;
              const title =
                linkEl.innerText.trim() ||
                linkEl.getAttribute("aria-label") ||
                "";

              // Filter Google internal domains
              const skipDomains = [
                "google.com",
                "google.de",
                "gstatic.com",
                "support.google.com",
              ];

              if (
                url &&
                url.startsWith("http") &&
                !skipDomains.some((d) => url.includes(d)) &&
                !seen.has(url)
              ) {
                seen.add(url);
                sources.push({
                  title: title,
                  url: url,
                  source: new URL(url).hostname,
                });
              }
            }
          }

          allCitations.push({ marker_id: markerId, sources: sources });
        }

        // Return: Modified HTML (with markers) + extracted sources
        return {
          html: mainCol.innerHTML,
          citations: allCitations,
        };
      }, CITATION_SELECTORS);

      // Check for errors
      if ("error" in result) {
        throw new CitationExtractionError(result.error as string);
      }

      const { html, citations } = result as { html: string; citations: any[] };

      if (!html || html.trim().length === 0) {
        throw new CitationExtractionError("No AI response HTML found");
      }

      // Convert citations to format needed by markdown converter
      // Keep ALL sources per citation (not just first!)
      const formattedCitations = citations.map((c: any) => ({
        marker_id: c.marker_id,
        marker: `[CITE-${c.marker_id}]`,
        sources: c.sources.map((s: any) => ({
          title: s.title,
          url: s.url,
          domain: s.source,
        })),
      }));

      // Count total sources
      const totalSources = formattedCitations.reduce(
        (sum: number, c: any) => sum + c.sources.length,
        0
      );

      log.success(
        `✅ Extracted ${citations.length} citations with ${totalSources} total sources`
      );

      return { html, citations: formattedCitations };
    } catch (error) {
      log.error(`Failed to extract AI response: ${error}`);
      throw new CitationExtractionError(`Extraction failed: ${error}`);
    }
  }
}
