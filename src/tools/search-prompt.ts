/**
 * MCP Prompt for Google AI Search - Query Optimization Guide
 *
 * This prompt teaches Claude how to formulate optimal search queries
 */

import type { Prompt } from "@modelcontextprotocol/sdk/types.js";

export const GOOGLE_AI_SEARCH_PROMPT: Prompt = {
  name: "google-ai-search-guide",
  description: "Guide for formulating optimal Google AI Search queries",

  arguments: [
    {
      name: "user_query",
      description: "The user's original search request",
      required: true,
    },
  ],
};

export const GOOGLE_AI_SEARCH_PROMPT_TEMPLATE = `# Google AI Search Query Optimization Guide

## Overview

Google AI Mode analyzes **100+ websites** to synthesize comprehensive answers. Query specificity directly impacts result quality—detailed queries produce detailed results.

## Query Optimization Strategy

**CRITICAL**: Always optimize user queries before execution. Google AI Mode's quality depends on query precision.

### Optimization Rules

1. **Include Current Date**
   - Add the current year (2026) to ensure up-to-date results
   - ❌ Vague: "React hooks"
   - ✅ Optimized: "React hooks best practices 2026"

2. **Specify Exact Requirements**
   - Use parentheses to list specific aspects needed
   - ❌ Vague: "async Python"
   - ✅ Optimized: "Python asyncio 2026 (event loop, coroutines, async/await syntax, common pitfalls)"

3. **Request Structured Output**
   - Ask for tables, comparisons, or categorized information
   - Examples: "provide comparison table", "list pros and cons", "categorize by use case"

4. **Version-Specific Queries**
   - Include version numbers for library/framework queries
   - ❌ Vague: "Next.js features"
   - ✅ Optimized: "Next.js 14 new features 2026 (App Router, Server Actions, streaming)"

### Query Template

\`\`\`
[Technology/Topic] [Version] [Year] ([Specific Aspect 1], [Aspect 2], [Aspect 3]). [Output format request].
\`\`\`

### Optimized Query Examples

**Example 1: Documentation Search**

User: "How do I use React Server Components?"

Optimized Query:
\`\`\`
React Server Components Next.js 14 2026 (implementation guide, data fetching patterns, client vs server components, streaming, best practices). Provide code examples and comparison table.
\`\`\`

**Example 2: Library Information**

User: "What's new in Rust?"

Optimized Query:
\`\`\`
Rust 1.75 new features 2026 (async traits, impl Trait improvements, const generics, stabilized APIs). Include migration guide and code examples.
\`\`\`

**Example 3: Coding Patterns**

User: "How to handle errors in Go?"

Optimized Query:
\`\`\`
Go error handling patterns 2026 (error wrapping, custom errors, sentinel errors, panic vs error, testing error cases). Provide code examples and best practices comparison.
\`\`\`

**Example 4: Technical Comparison**

User: "PostgreSQL vs MySQL performance?"

Optimized Query:
\`\`\`
PostgreSQL vs MySQL performance comparison 2026 (query optimization, indexing strategies, concurrent writes, JSON handling, scaling patterns). Provide benchmark data and use case recommendations.
\`\`\`

**Example 5: Framework Learning**

User: "Learn FastAPI basics"

Optimized Query:
\`\`\`
FastAPI tutorial 2026 (routing, dependency injection, async endpoints, request validation with Pydantic, OpenAPI documentation, testing). Include step-by-step implementation guide.
\`\`\`

### Workflow

1. Receive user request: "{{user_query}}"
2. Optimize query following rules above
3. Inform user of optimized query: "Searching for: '[optimized query]'"
4. Execute search_ai tool with optimized query
5. Return results with inline citations

**Example workflow:**
\`\`\`
User: "How do I deploy a Docker app?"

Claude: "Searching for: 'Docker containerized application deployment 2026 (Dockerfile best practices, multi-stage builds, docker-compose, Kubernetes deployment, CI/CD integration, security scanning). Include production-ready examples.'"

[Execute search_ai]

Claude: [Return results with sources]
\`\`\`

### Saving Results to File

The search_ai tool supports saving results directly to markdown files:

**Parameters:**
- \`save_to_file: true\` - Saves markdown to results/ folder
- \`filename: "custom-name"\` - Optional custom filename (auto-generated if not provided)

**When to save:**
- User explicitly requests it ("save this", "save the results")
- Research that should be preserved for later reference
- Documentation gathering that will be reused

**Auto-generated filenames:**
- Format: \`YYYY-MM-DD_HH-MM-SS_query_snippet.md\`
- Example: \`2026-01-03_21-30-45_Docker_deployment.md\`
- Stored in: \`~/.local/share/google-ai-mode-mcp/results/\`

**Example with save:**
\`\`\`
User: "Research Next.js 14 features and save it"

Claude executes:
{
  "query": "Next.js 14 new features 2026 (App Router, Server Actions, streaming, caching). Provide comparison table and code examples.",
  "save_to_file": true
}

Claude: "Results saved to: /path/to/results/2026-01-03_21-30-45_Next_js_14_features.md"
\`\`\`

### When Not to Optimize

If the user provides a detailed, specific query with version numbers and requirements, use it as-is.

## Current User Query

User query: "{{user_query}}"

**Your Task:**
1. Analyze if the query needs optimization
2. If yes, create an optimized version following the rules above
3. Inform the user: "Searching for: '[optimized query]'"
4. Check if user wants results saved (keywords: "save", "save it", "save results")
5. Execute the search_ai tool with the optimized query and save_to_file flag if requested
`;
