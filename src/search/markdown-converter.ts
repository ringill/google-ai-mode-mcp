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
import { CUTOFF_MARKERS } from "../constants/language-constants.js";

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
   * EXACT 1:1 CLONE of Python skill logic (lines 480-501)!
   * Replaces [CITE-0] with [1][2] based on actual sources per citation
   */
  embedCitations(
    markdown: string,
    citations: any[], // Raw citation groups with all sources
    _sources: Source[] // Unused, kept for interface compatibility
  ): { markdown: string; sources: Source[] } {
    try {
      log.info("🔗 Embedding citations...");

      let modifiedMd = markdown;
      const citationSources: Source[] = [];

      // Sort citations by marker_id (highest first) to preserve indices during replacement
      // EXACT SKILL LOGIC: sorted(citations, key=lambda c: c['marker_id'], reverse=True)
      const citationsSorted = [...citations].sort(
        (a, b) => (b.marker_id || 999) - (a.marker_id || 999)
      );

      for (const citation of citationsSorted) {
        const markerId = citation.marker_id;
        const marker = `[CITE-${markerId}]`;
        const sources = citation.sources || [];

        if (sources.length > 0) {
          const startIdx = citationSources.length;

          // Generate footnote string: [1][2][3]
          // EXACT SKILL LOGIC: ''.join(f'[{start_idx + i + 1}]' for i in range(len(sources)))
          const footnotes = sources
            .map((_: any, i: number) => `[${startIdx + i + 1}]`)
            .join("");

          // Replace marker in text (first occurrence only)
          // EXACT SKILL LOGIC: modified_md.replace(marker, footnotes, 1)
          if (modifiedMd.includes(marker)) {
            modifiedMd = modifiedMd.replace(marker, footnotes);
            citationSources.push(...sources);
          }
        }
      }

      // Remove leftover markers (if no sources found)
      // EXACT SKILL LOGIC: re.sub(r'\[CITE-\d+\]', '', modified_md)
      modifiedMd = modifiedMd.replace(/\[CITE-\d+\]/g, "");

      log.success(
        `✅ Embedded ${citations.length} citations with ${citationSources.length} sources`
      );

      // DON'T add sources here! Will be added AFTER postProcessMarkdown (like skill!)
      return {
        markdown: modifiedMd,
        sources: citationSources,
      };
    } catch (error) {
      log.warning(`Citation embedding failed: ${error}`);
      return { markdown, sources: [] };
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
      for (const disclaimer of CUTOFF_MARKERS) {
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
   * Full conversion pipeline: HTML → Markdown → Citations → Post-process → Sources
   * EXACT 1:1 CLONE of Python skill flow (lines 698-760)!
   */
  convert(
    html: string,
    citations: Citation[],
    sources: Source[]
  ): { markdown: string; sources: Source[] } {
    // Convert HTML to markdown
    let markdown = this.convertToMarkdown(html);

    // Embed citations (replaces [CITE-0] with [1][2], returns sources)
    const { markdown: mdWithCitations, sources: citationSources } =
      this.embedCitations(markdown, citations, sources);

    // Post-process (cleanup, cutoff at disclaimer)
    let processed = this.postProcessMarkdown(mdWithCitations);

    // Append sources section at the end (AFTER post-processing, like skill!)
    // EXACT SKILL LOGIC: lines 756-760
    if (citationSources.length > 0) {
      processed += "\n\n---\n\n## Sources:\n\n";
      citationSources.forEach((source, index) => {
        processed += `[${index + 1}] ${source.title}  \n${source.url}\n\n`;
      });
    }

    return {
      markdown: processed,
      sources: citationSources,
    };
  }
}
