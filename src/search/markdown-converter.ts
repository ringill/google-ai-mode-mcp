/**
 * Markdown Converter for Google AI Search Mode
 *
 * Converts HTML to markdown using Turndown
 * Handles citation embedding and post-processing
 * Based on post-processing logic from 011_network_intercept.py
 */

import TurndownService from "turndown";
import type { Citation, Source } from "../types.js";
import { log } from "../utils/logger.js";
import { MarkdownConversionError } from "../errors.js";

// Disclaimer texts that mark the end of AI content (English primary)
const DISCLAIMER_MARKERS = [
  "AI-generated answers may contain errors",
  "Generative AI is experimental",
  "AI overviews are experimental",
  "KI-Antworten können Fehler enthalten", // German fallback
];

export class MarkdownConverter {
  private turndown: TurndownService;

  constructor() {
    // Initialize Turndown with configuration
    this.turndown = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "*",
      codeBlockStyle: "fenced",
      linkStyle: "inlined",
      emDelimiter: "_",
      strongDelimiter: "**",
    });

    // Remove unwanted elements
    this.turndown.remove(["script", "style", "noscript"]);

    // Preserve citation markers
    this.turndown.addRule("citationMarkers", {
      filter: (node) => {
        return (
          node.nodeName === "SPAN" &&
          (node as any).className === "citation-marker"
        );
      },
      replacement: (content) => content, // Keep markers intact
    });

    log.info("📝 MarkdownConverter initialized");
  }

  /**
   * Convert HTML to markdown
   */
  convertToMarkdown(html: string): string {
    try {
      if (!html || html.trim().length === 0) {
        throw new MarkdownConversionError("Empty HTML provided");
      }

      log.info("🔄 Converting HTML to markdown...");

      const markdown = this.turndown.turndown(html);

      if (!markdown || markdown.trim().length === 0) {
        throw new MarkdownConversionError("Conversion produced empty markdown");
      }

      log.success(`✅ Converted to markdown (${markdown.length} chars)`);

      return markdown;
    } catch (error) {
      log.error(`Markdown conversion failed: ${error}`);
      throw new MarkdownConversionError(`Conversion failed: ${error}`);
    }
  }

  /**
   * Embed citations into markdown
   * Replaces [CITE-1] with [1], adds source list at bottom
   */
  embedCitations(
    markdown: string,
    citations: Citation[],
    sources: Source[]
  ): { markdown: string; sources: Source[] } {
    try {
      log.info("🔗 Embedding citations...");

      let processedMarkdown = markdown;

      // Replace citation markers with numbered references
      // Note: Turndown escapes [ and ] as \[ and \], so we need to match those
      citations.forEach((_citation, index) => {
        const citationNumber = index + 1;
        // Match both escaped and non-escaped versions
        const escapedMarkerRegex = new RegExp(
          `\\\\\\[CITE-${citationNumber}\\\\\\]`,
          "g"
        );
        const normalMarkerRegex = new RegExp(
          `\\[CITE-${citationNumber}\\]`,
          "g"
        );

        // Try escaped version first (Turndown escapes them)
        processedMarkdown = processedMarkdown.replace(
          escapedMarkerRegex,
          `[${citationNumber}]`
        );
        // Then try normal version (fallback)
        processedMarkdown = processedMarkdown.replace(
          normalMarkerRegex,
          `[${citationNumber}]`
        );
      });

      // Add source list at the bottom if we have sources
      if (sources.length > 0) {
        processedMarkdown += "\n\n## Sources\n\n";
        sources.forEach((source, index) => {
          processedMarkdown += `[${index + 1}] [${source.title}](${source.url}) - ${source.domain}\n`;
        });
      }

      log.success(`✅ Embedded ${citations.length} citations and ${sources.length} sources`);

      return {
        markdown: processedMarkdown,
        sources,
      };
    } catch (error) {
      log.warning(`Citation embedding failed: ${error}`);
      return { markdown, sources };
    }
  }

  /**
   * Post-process markdown to clean up formatting
   * Based on 011_network_intercept.py post-processing
   */
  postProcessMarkdown(markdown: string): string {
    try {
      log.info("🧹 Post-processing markdown...");

      let processed = markdown;

      // Remove ==highlighting==
      processed = processed.replace(/==/g, "");

      // Remove base64 embedded images
      processed = processed.replace(
        /!\[[^\]]*\]\(data:image\/[^)]+\)/g,
        ""
      );

      // Remove empty links []()
      processed = processed.replace(/\[\]\([^)]*\)/g, "");

      // Cut off at disclaimer if present
      for (const disclaimer of DISCLAIMER_MARKERS) {
        const index = processed.indexOf(disclaimer);
        if (index !== -1) {
          processed = processed.substring(0, index);
          log.info(`   Cut off at disclaimer: "${disclaimer}"`);
          break;
        }
      }

      // Smart line merging (fix broken sentences)
      // Replace single newline with space if line doesn't end with punctuation
      processed = processed.replace(/([^.!?\n])\n([^\n#*\-\d])/g, "$1 $2");

      // Reduce multiple blank lines to maximum 2
      processed = processed.replace(/\n{3,}/g, "\n\n");

      // Trim whitespace
      processed = processed.trim();

      log.success(`✅ Post-processing complete (${processed.length} chars)`);

      return processed;
    } catch (error) {
      log.warning(`Post-processing failed: ${error}`);
      return markdown;
    }
  }

  /**
   * Full conversion pipeline: HTML → Markdown → Citations → Post-process
   */
  convert(
    html: string,
    citations: Citation[],
    sources: Source[]
  ): { markdown: string; sources: Source[] } {
    // Convert HTML to markdown
    let markdown = this.convertToMarkdown(html);

    // Embed citations
    const result = this.embedCitations(markdown, citations, sources);

    // Post-process
    result.markdown = this.postProcessMarkdown(result.markdown);

    return result;
  }
}
