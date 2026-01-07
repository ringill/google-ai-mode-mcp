/**
 * MCP Tool Handler for Google AI Search
 */

import * as fs from "fs";
import * as path from "path";
import type { SearchResult, SearchOptions, ProgressCallback } from "../types.js";
import { SearchHandler } from "../search/search-handler.js";
import { CONFIG } from "../config.js";
import { log } from "../utils/logger.js";

export class ToolHandler {
  private searchHandler: SearchHandler;

  constructor() {
    this.searchHandler = new SearchHandler();
  }

  /**
   * Handle search_ai tool call
   */
  async handleSearchAi(
    args: {
      query: string;
      headless?: boolean;
      timeout_ms?: number;
      save_to_file?: boolean;
      filename?: string;
    },
    sendProgress: ProgressCallback
  ): Promise<SearchResult> {
    try {
      const { query, headless, timeout_ms, save_to_file, filename } = args;

      // Validate query
      if (!query || query.trim().length === 0) {
        return {
          success: false,
          markdown: "",
          sources: [],
          query: "",
          error: "Query cannot be empty",
        };
      }

      log.info(`🔍 Tool call: search_ai("${query}")`);

      // Build options
      const options: SearchOptions = {};
      if (headless !== undefined) {
        options.headless = headless;
      }
      if (timeout_ms !== undefined) {
        options.timeout_ms = timeout_ms;
      }

      // Send progress: Starting search
      await sendProgress("Navigating to Google AI Search...");

      // Execute search
      const result = await this.searchHandler.executeSearch(query, options);

      // Save to file if requested and search was successful
      if (save_to_file && result.success && result.markdown) {
        try {
          await sendProgress("Saving result to file...");
          const savedPath = await this.saveToFile(
            result.markdown,
            query,
            filename
          );
          result.savedTo = savedPath;
          log.success(`📄 Saved to: ${savedPath}`);
        } catch (error) {
          log.warning(`Failed to save file: ${error}`);
          result.saveError = error instanceof Error ? error.message : String(error);
        }
      }

      // Send progress based on result
      if (result.success) {
        await sendProgress("Search completed successfully!", 100, 100);
      } else if (result.captchaRequired) {
        await sendProgress(
          "CAPTCHA detected - please solve in visible browser"
        );
      } else {
        await sendProgress(`Search failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      log.error(`Tool handler error: ${error}`);

      return {
        success: false,
        markdown: "",
        sources: [],
        query: args.query || "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Save markdown result to file
   * @param markdown - The markdown content to save
   * @param query - The search query (used for auto-generated filename)
   * @param customFilename - Optional custom filename
   * @returns Path to the saved file
   */
  private async saveToFile(
    markdown: string,
    query: string,
    customFilename?: string
  ): Promise<string> {
    // Create results directory
    const resultsDir = path.join(CONFIG.dataDir, "results");
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Generate filename
    let filename: string;
    if (customFilename) {
      // Use custom filename, ensure .md extension
      filename = customFilename.endsWith(".md")
        ? customFilename
        : `${customFilename}.md`;
    } else {
      // Auto-generate from query and timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/T/, "_")
        .replace(/:/g, "-")
        .split(".")[0]; // YYYY-MM-DD_HH-MM-SS
      const safeName = query
        .substring(0, 40) // Max 40 chars
        .replace(/[^a-zA-Z0-9]/g, "_") // Replace non-alphanumeric with _
        .replace(/_+/g, "_") // Collapse multiple underscores
        .replace(/^_|_$/g, ""); // Trim underscores from start/end
      filename = `${timestamp}_${safeName}.md`;
    }

    // Write file
    const filePath = path.join(resultsDir, filename);
    fs.writeFileSync(filePath, markdown, "utf-8");

    return filePath;
  }

  /**
   * Cleanup handler
   */
  async cleanup(): Promise<void> {
    await this.searchHandler.cleanup();
  }
}
