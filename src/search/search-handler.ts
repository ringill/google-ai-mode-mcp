/**
 * Search Handler for Google AI Search Mode
 *
 * Orchestrates the entire search flow:
 * 1. Navigate to Google AI Search
 * 2. Check for CAPTCHA
 * 3. Extract response and citations
 * 4. Convert to markdown
 * 5. Return result
 */

import type { SearchResult, SearchOptions } from "../types.js";
import { BrowserManager } from "../browser/browser-manager.js";
import { CaptchaDetector } from "../browser/captcha-detector.js";
import { ResponseParser } from "./response-parser.js";
import { MarkdownConverter } from "./markdown-converter.js";
import { CONFIG, applyBrowserOptions, type Config } from "../config.js";
import { log } from "../utils/logger.js";
import { CaptchaTimeoutError } from "../errors.js";
import { waitForAiCompletion, checkAiModeAvailability } from "../utils/completion-detector.js";
import {
  COMPOSER_ATTACH_SELECTORS,
  COMPOSER_ADD_IMAGES_SELECTORS,
  COMPOSER_ADD_IMAGES_KEYWORDS,
  COMPOSER_SEND_ARIA_LABELS,
} from "../constants/language-constants.js";

export class SearchHandler {
  private browserManager: BrowserManager;
  private captchaDetector: CaptchaDetector;
  private responseParser: ResponseParser;
  private markdownConverter: MarkdownConverter;

  constructor() {
    this.browserManager = new BrowserManager();
    this.captchaDetector = new CaptchaDetector();
    this.responseParser = new ResponseParser();
    this.markdownConverter = new MarkdownConverter();

    log.info("🔍 SearchHandler initialized");
  }

  /**
   * Build Google AI Search URL
   */
  private buildSearchUrl(query: string): string {
    const encodedQuery = encodeURIComponent(query);
    return `https://www.google.com/search?udm=50&q=${encodedQuery}`;
  }

  /**
   * Execute a search and return result
   */
  async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      log.info("="

.repeat(80));
      log.info(`🔍 Starting Google AI Search: "${query}"`);
      log.info("=".repeat(80));

      // Apply options to config
      const config = applyBrowserOptions(options);

      // Get browser context
      const context = await this.browserManager.getOrCreateContext(
        config.headless
      );

      // Create new page
      const page = await context.newPage();

      // Multimodal search path: attach an image alongside the text query
      if (options?.imagePath) {
        return await this.executeImageSearch(
          page,
          query,
          options.imagePath,
          config
        );
      }

      // Build search URL
      const searchUrl = this.buildSearchUrl(query);
      log.info(`📍 URL: ${searchUrl}`);

      try {
        // Navigate to Google AI Search
        log.info("🌐 Navigating to Google AI Search...");
        await page.goto(searchUrl, {
          waitUntil: "domcontentloaded",
          timeout: CONFIG.browserTimeout,
        });

        // Check for CAPTCHA (immediate)
        log.info("🔒 Checking for CAPTCHA...");
        const captchaState = await this.captchaDetector.detectCaptcha(page);

        if (captchaState.detected) {
          // CAPTCHA detected - handle it
          const needsBrowserRestart = this.browserManager.recordCaptcha();

          if (needsBrowserRestart) {
            // Too many consecutive CAPTCHAs - restart browser
            await page.close();
            await this.browserManager.restartBrowser("max consecutive CAPTCHAs");

            // Return error indicating browser restart
            return {
              success: false,
              markdown: "",
              sources: [],
              query,
              captchaRequired: true,
              error: "Too many consecutive CAPTCHAs - browser restarted. Please try again.",
            };
          }

          // Switch to visible mode
          await this.browserManager.switchToVisibleMode();

          // Get visible context and create new page
          const visibleContext =
            await this.browserManager.getOrCreateContext(false);
          await page.close();
          const visiblePage = await visibleContext.newPage();

          // Navigate again in visible mode
          await visiblePage.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: CONFIG.browserTimeout,
          });

          // Handle CAPTCHA (wait for solution)
          try {
            await this.captchaDetector.handleCaptcha(visiblePage);

            // Check AI Mode availability (region/language restrictions)
            const aiModeAvailable = await checkAiModeAvailability(visiblePage);
            if (!aiModeAvailable) {
              await visiblePage.close();
              return {
                success: false,
                markdown: "",
                sources: [],
                query,
                error: "Google AI Mode is not available in your country or language. Please use a proxy/VPN to access from a supported region (e.g., US, UK, Germany).",
              };
            }

            // Wait for AI response completion (SVG → aria-label → text → timeout)
            await waitForAiCompletion(visiblePage);

            // CAPTCHA solved - continue with visible page
            // Don't switch back to headless yet - keep using visible page for this search
            const result = await this.performSearch(visiblePage, query);

            // Close page
            await visiblePage.close();

            // Switch back to headless mode for next search
            await this.browserManager.switchToHeadlessMode();

            // Reset CAPTCHA counter on success
            this.browserManager.resetCaptchaCounter();

            return result;
          } catch (error) {
            if (error instanceof CaptchaTimeoutError) {
              await visiblePage.close();

              return {
                success: false,
                markdown: "",
                sources: [],
                query,
                captchaRequired: true,
                error: "CAPTCHA timeout - please solve CAPTCHA manually",
              };
            }

            throw error;
          }
        } else {
          // No CAPTCHA - check AI Mode availability and wait for completion
          const aiModeAvailable = await checkAiModeAvailability(page);
          if (!aiModeAvailable) {
            await page.close();
            return {
              success: false,
              markdown: "",
              sources: [],
              query,
              error: "Google AI Mode is not available in your country or language. Please use a proxy/VPN to access from a supported region (e.g., US, UK, Germany).",
            };
          }

          // Wait for AI response completion (SVG → aria-label → text → timeout)
          await waitForAiCompletion(page);

          // Proceed with search
          const result = await this.performSearch(page, query);

          // Close page
          await page.close();

          // Reset CAPTCHA counter on success
          this.browserManager.resetCaptchaCounter();

          return result;
        }
      } catch (error) {
        // Close page on error
        await page.close();
        throw error;
      }
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      log.error(`❌ Search failed after ${elapsed}s: ${error}`);

      return {
        success: false,
        markdown: "",
        sources: [],
        query,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Multimodal search: attach an image + text via the live AI Mode composer.
   * Reuses the CAPTCHA handling flow from executeSearch, then drives the DOM:
   * focus composer → open attach menu → "Add images" → file chooser → submit.
   */
  private async executeImageSearch(
    page: any,
    query: string,
    imagePath: string,
    config: Config
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const aimodeUrl = "https://www.google.com/aimode";
    let workingPage = page;
    let contextSwitch = false;

    try {
      log.info("🖼️  Starting MULTIMODAL search (image + text)...");
      log.info(`   Image: ${imagePath}`);

      // Navigate to AI Mode
      await workingPage.goto(aimodeUrl, {
        waitUntil: "domcontentloaded",
        timeout: config.browserTimeout,
      });

      // CAPTCHA handling (same policy as the text flow)
      const captchaState = await this.captchaDetector.detectCaptcha(workingPage);
      if (captchaState.detected) {
        const needsRestart = this.browserManager.recordCaptcha();
        if (needsRestart) {
          await workingPage.close();
          await this.browserManager.restartBrowser(
            "max consecutive CAPTCHAs"
          );
          return {
            success: false,
            markdown: "",
            sources: [],
            query,
            captchaRequired: true,
            error: "Too many consecutive CAPTCHAs - browser restarted. Please try again.",
          };
        }

        log.warning("🔴 CAPTCHA detected - switching to visible mode");
        await this.browserManager.switchToVisibleMode();
        contextSwitch = true;
        const visibleContext =
          await this.browserManager.getOrCreateContext(false);
        await workingPage.close();
        workingPage = await visibleContext.newPage();
        await workingPage.goto(aimodeUrl, {
          waitUntil: "domcontentloaded",
          timeout: config.browserTimeout,
        });
        await this.captchaDetector.handleCaptcha(workingPage);
      }

      // Drive the composer upload + submit flow
      const result = await this.runImageComposerFlow(
        workingPage,
        query,
        imagePath
      );

      await workingPage.close();

      // Return to headless for the next search if we switched for CAPTCHA
      if (contextSwitch) {
        await this.browserManager.switchToHeadlessMode();
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      log.success(`🖼️  Multimodal search completed in ${elapsed}s`);
      this.browserManager.resetCaptchaCounter();
      return result;
    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      log.error(`❌ Multimodal search failed after ${elapsed}s: ${error}`);
      await workingPage.close().catch(() => {});
      throw error;
    }
  }

  /**
   * Interact with the AI Mode composer: attach the image, type the query, submit,
   * wait for completion and extract the answer.
   */
  private async runImageComposerFlow(
    page: any,
    query: string,
    imagePath: string
  ): Promise<SearchResult> {
    // Wait for the composer search box to be ready and focus the VISIBLE one.
    // `textarea.ITIRGe` matches two elements (the visible composer and a hidden
    // 0x0 collapsed top-bar one); waitForSelector/focus/$ lock onto the FIRST
    // DOM match, which is the hidden one, so we resolve by geometry instead.
    await page.waitForSelector("textarea.ITIRGe", {
      state: "attached",
      timeout: CONFIG.responseTimeout,
    });
    await this.focusVisibleTextarea(page);
    await page.waitForTimeout(800);

    // Register the file chooser handler BEFORE opening the menu
    let attached = false;
    const chooserHandler = async (chooser: any) => {
      try {
        await chooser.setFiles(imagePath);
        attached = true;
        log.success("✅ Image attached via file chooser");
      } catch (e) {
        log.error(`❌ setFiles failed: ${e}`);
      }
    };
    page.on("filechooser", chooserHandler);

    // 1. Open the attach menu (click the VISIBLE attach button)
    const attachCenter = await this.findClickableButton(
      page,
      COMPOSER_ATTACH_SELECTORS
    );
    if (!attachCenter) {
      throw new Error("Attach button not found in AI Mode composer");
    }
    log.info("📎 Opening attach menu...");
    await page.mouse.click(attachCenter.x, attachCenter.y);
    await page.waitForTimeout(1200);

    // 2. Click the "Add images" menu item
    const addImagesCenter = await this.findClickableButton(
      page,
      COMPOSER_ADD_IMAGES_SELECTORS,
      COMPOSER_ADD_IMAGES_KEYWORDS
    );
    if (!addImagesCenter) {
      throw new Error("'Add images' menu item not found");
    }
    log.info("🖼️  Clicking 'Add images'...");
    await page.mouse.click(addImagesCenter.x, addImagesCenter.y);

    // 3. Wait for the file chooser to fire and the image to attach
    await page.waitForTimeout(4000);
    if (!attached) {
      // Fallback: some builds expose a hidden file input directly
      const fileInput = await page.$("input[type='file']");
      if (fileInput) {
        await fileInput.setInputFiles(imagePath);
        attached = true;
        log.success("✅ Image attached via file input");
      }
    }
    if (!attached) {
      throw new Error("Could not attach image to AI Mode (file chooser did not fire)");
    }

    // 4. Type the query, then wait until the composer's Send button becomes
    //    enabled. That is the authoritative signal that the image upload has
    //    finished processing server-side: the Send button stays disabled for the
    //    whole upload even with text present, and flips to enabled only once the
    //    attachment is ready (observed latency varies widely, ~0.1s to >4s, so a
    //    blind timeout here is unreliable in both directions).
    await this.focusVisibleTextarea(page);
    await page.keyboard.type(query, { delay: 15 });
    log.info("✍️  Query typed; waiting for upload to finish (Send enabled)...");
    await page.waitForFunction(
      (labels: string[]) => {
        const selector = labels
          .map((l) => `button[aria-label='${l}']`)
          .join(", ");
        const send = document.querySelector<HTMLButtonElement>(selector);
        return !!send && !send.disabled;
      },
      COMPOSER_SEND_ARIA_LABELS,
      { timeout: 15000 }
    );
    log.success("✅ Image upload complete; Send enabled");
    await page.keyboard.press("Enter");

    // 5. Wait for AI completion, then extract the answer
    await checkAiModeAvailability(page);
    await waitForAiCompletion(page);

    return await this.performSearch(page, query);
  }

  /**
   * Focus the VISIBLE AI Mode composer textarea.
   *
   * The page renders two `textarea.ITIRGe` elements: the live composer and a
   * hidden 0x0 collapsed top-bar duplicate. Playwright's waitForSelector/focus/$/
   * selectors all lock onto the FIRST DOM match (the hidden one), so here we
   * locate the visible textarea by geometry and click its center to focus it.
   */
  private async focusVisibleTextarea(page: any): Promise<void> {
    const center = await page.evaluate(() => {
      const matches: HTMLElement[] = Array.from(
        document.querySelectorAll("textarea.ITIRGe")
      ) as HTMLElement[];
      for (const el of matches) {
        const r = el.getBoundingClientRect();
        const s = window.getComputedStyle(el);
        if (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          s.display !== "none"
        ) {
          return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
        }
      }
      return null;
    });
    if (!center) {
      throw new Error("AI Mode composer textarea not found");
    }
    await page.mouse.click(center.x, center.y);
  }

  /**
   * Locate a visible clickable button (first non-zero-size match) across a set of
   * localized selectors, returning its on-screen center point.
   */
  private async findClickableButton(
    page: any,
    selectors: string[],
    textKeywords?: string[]
  ): Promise<{ x: number; y: number } | null> {
    const rect = await page.evaluate(
      (args: { selectors: string[]; textKeywords?: string[] }) => {
        const { selectors, textKeywords } = args;
        const matches: Element[] = [];
        for (const sel of selectors) {
          matches.push(...Array.from(document.querySelectorAll(sel)));
        }
        if (textKeywords && textKeywords.length) {
          for (const b of Array.from(
            document.querySelectorAll("button")
          )) {
            const t = (b.textContent || "").trim().toLowerCase();
            if (
              textKeywords.some((k) => t.includes(k.toLowerCase()))
            ) {
              matches.push(b);
            }
          }
        }
        for (const m of matches) {
          const el = m as HTMLElement;
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          if (
            r.width > 0 &&
            r.height > 0 &&
            s.visibility !== "hidden" &&
            s.display !== "none"
          ) {
            return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
          }
        }
        return null;
      },
      { selectors, textKeywords }
    );
    return rect;
  }

  /**
   * Perform the actual search (after CAPTCHA is handled)
   */
  private async performSearch(
    page: any,
    query: string
  ): Promise<SearchResult> {
    try {
      // Extract AI response, citations, and sources (all in one - 1:1 clone from skill!)
      log.info("📝 Extracting AI response and citations...");
      const { html, citations } = await this.responseParser.extractAiResponse(
        page
      );

      // Convert to markdown (citations → footnotes, returns sources!)
      log.info("📄 Converting to markdown...");
      const { markdown, sources: embeddedSources } = this.markdownConverter.convert(
        html,
        citations,
        [] // Empty array, converter gets sources from citations
      );

      log.info("=".repeat(80));
      log.success("✅ Search completed successfully!");
      log.info(`   Citations: ${citations.length}`);
      log.info(`   Sources: ${embeddedSources.length}`);
      log.info(`   Markdown length: ${markdown.length} chars`);
      log.info("=".repeat(80));

      return {
        success: true,
        markdown,
        sources: embeddedSources, // Use sources from markdown converter!
        query,
      };
    } catch (error) {
      log.error(`Search execution failed: ${error}`);
      throw error;
    }
  }

  /**
   * Cleanup and close browser
   */
  async cleanup(): Promise<void> {
    log.info("🧹 Cleaning up SearchHandler...");
    await this.browserManager.closeContext();
    log.success("✅ Cleanup complete");
  }
}
