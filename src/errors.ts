/**
 * Custom error classes for Google AI Search Mode MCP Server
 */

/**
 * Thrown when a CAPTCHA is detected during search
 */
export class CaptchaDetectedError extends Error {
  constructor(message: string = "CAPTCHA detected") {
    super(message);
    this.name = "CaptchaDetectedError";
  }
}

/**
 * Thrown when CAPTCHA solving times out
 */
export class CaptchaTimeoutError extends Error {
  constructor(message: string = "CAPTCHA solving timeout") {
    super(message);
    this.name = "CaptchaTimeoutError";
  }
}

/**
 * Thrown when search response times out
 */
export class SearchTimeoutError extends Error {
  constructor(message: string = "Search response timeout") {
    super(message);
    this.name = "SearchTimeoutError";
  }
}

/**
 * Thrown when citation extraction fails
 */
export class CitationExtractionError extends Error {
  constructor(message: string = "Citation extraction failed") {
    super(message);
    this.name = "CitationExtractionError";
  }
}

/**
 * Thrown when markdown conversion fails
 */
export class MarkdownConversionError extends Error {
  constructor(message: string = "Markdown conversion failed") {
    super(message);
    this.name = "MarkdownConversionError";
  }
}
