'use strict';

/**
 * Centralized prompt builder for all AI interactions.
 * Keeps prompts testable and out of service files.
 */
class PromptBuilder {
  /**
   * RAG prompt for general code Q&A.
   */
  buildRAGPrompt(repoContext, codeChunks, userQuestion) {
    return `
You are an expert software engineer helping a developer understand the repository: "${repoContext.name}".

Repository Details:
- Owner: ${repoContext.owner}
- Stack: ${this._stackSummary(repoContext.detectedStack)}
- Total files: ${repoContext.totalFiles}

Relevant Code Context (from semantic search):
${codeChunks.map((c, i) => `
--- Chunk ${i + 1}: ${c.filePath} ---
${c.content}
`).join('\n')}

Developer's Question: "${userQuestion}"

Respond with a JSON object:
{
  "explanation": "Clear, direct answer to the question",
  "flowSteps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "relatedFiles": ["path/to/relevant/file.js"],
  "codeExamples": [{"file": "...", "snippet": "..."}]
}
`.trim();
  }

  /**
   * Commit analysis prompt — for AI impact analysis.
   */
  buildCommitAnalysisPrompt(commit, repoContext) {
    const changedFilesText = commit.changedFiles
      .slice(0, 10) // Limit to avoid token overflow
      .map((f) => `- ${f.filename} (${f.status}, +${f.additions}/-${f.deletions})\n${f.patch ? f.patch.slice(0, 500) : ''}`)
      .join('\n\n');

    return `
You are a senior software engineer analyzing a git commit.
Repository: ${repoContext.name} (${this._stackSummary(repoContext.detectedStack)})
Architecture: Feature-based MERN

Commit SHA: ${commit.sha}
Commit Message: "${commit.message}"
Author: ${commit.author?.name || 'Unknown'}

Changed Files:
${changedFilesText}

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "whatChanged": "1-2 sentence plain English summary of what changed",
  "whyItChanged": "Inferred purpose or reason for this change",
  "affectedModules": ["auth", "email"],
  "impactLevel": "low",
  "flowDescription": "User → Component → Route → Controller → Service → Database",
  "summary": "One line for email notification"
}

impactLevel must be exactly: "low", "medium", or "high"
`.trim();
  }

  /**
   * Data flow identification prompt — basic (kept for fallback compatibility).
   */
  buildFlowIdentificationPrompt(repoContext, query, importantFiles) {
    return `
You are analyzing the repository "${repoContext.name}" to trace data flow.

Available files:
${importantFiles.map((f) => `- ${f.path} (${f.type})`).join('\n')}

User query: "${query}"

Identify the files involved in handling this request/feature in order of execution.
Respond with JSON only:
{
  "entryPoint": "The file where execution starts",
  "flowFiles": [
    { "path": "...", "layer": "component|route|controller|service|model|database", "action": "What this file does" }
  ],
  "description": "Human-readable data flow description"
}
`.trim();
  }

  /**
   * Detailed flow control prompt — produces rich step-by-step execution trace with code hints.
   * This is the main prompt for the Flow Control feature.
   */
  buildDetailedFlowControlPrompt(repoContext, query, importantFiles, codeSnippets = []) {
    const stack = this._stackSummary(repoContext.detectedStack);
    const fileList = importantFiles
      .slice(0, 40)
      .map((f) => `- ${f.path} (${f.type || 'file'})`)
      .join('\n');

    const snippets = codeSnippets
      .slice(0, 6)
      .map((s, i) => `\n--- Relevant Code Chunk ${i + 1}: ${s.filePath} ---\n${s.content?.slice(0, 600) || ''}`)
      .join('\n');

    return `
You are a senior software architect analyzing the "${repoContext.name}" codebase (${stack}).

Repository Files:
${fileList}

${snippets ? `Relevant Code Snippets (from semantic search):\n${snippets}` : ''}

Developer Query: "${query}"

Produce a DETAILED step-by-step execution flow trace. Think through every layer the request passes through.
Respond ONLY with valid JSON (no markdown fences, no explanations outside JSON):
{
  "entryPoint": "path/to/starting/file.js",
  "description": "2-3 sentence human-readable narrative of the complete flow",
  "flowSteps": [
    {
      "stepNumber": 1,
      "title": "Short action title (e.g. 'User Submits Login Form')",
      "file": "path/to/file.js",
      "layer": "component",
      "action": "What happens at this step — be specific",
      "codeHint": "A short relevant code snippet or function name from this file, or empty string",
      "description": "Detailed explanation of what this step does and why"
    }
  ],
  "flowFiles": [
    { "path": "path/to/file.js", "layer": "component|route|controller|service|model|database", "action": "One-line action description" }
  ],
  "dataTransformations": [
    {
      "fromStep": 1,
      "toStep": 2,
      "what": "What data is passed (e.g. 'POST body {email, password}')",
      "how": "How it's passed (e.g. 'HTTP POST request', 'function argument', 'DB query result')"
    }
  ]
}

Rules:
- If the developer query asks for a feature or flow that clearly does NOT exist in the provided Repository Files or Snippets (e.g., asking about ATS scores in a Todo app), you MUST return an empty "flowSteps" array and set "description" to explain that the feature doesn't exist.
- "file" paths MUST EXACTLY MATCH one of the paths listed in the Repository Files above. Do not invent or guess file names.
- flowSteps must be in strict execution order (1, 2, 3...)
- layer must be exactly one of: component, route, controller, service, model, database
- Include ALL layers the request passes through — don't skip any
- Minimum 4 steps, maximum 12 steps (if a valid flow exists)
- codeHint should be a real function name or snippet you can infer from the file path/type
`.trim();
  }


  /**
   * File explanation prompt.
   */
  buildFileExplanationPrompt(filePath, fileContent, repoContext) {
    return `
You are an expert code reviewer explaining a file to a junior developer.
Repository: ${repoContext.name}

File: ${filePath}
Content:
\`\`\`
${fileContent.slice(0, 3000)}
\`\`\`

Explain this file clearly. Respond with JSON:
{
  "purpose": "What this file does",
  "keyFunctions": [{"name": "...", "description": "..."}],
  "imports": ["What it depends on"],
  "exports": ["What it provides"],
  "layer": "component|route|controller|service|model|config",
  "complexity": "simple|moderate|complex"
}
`.trim();
  }

  buildRepositorySummaryPrompt(repoContext, commits, stats) {
    const commitText = commits
      .slice(0, 10)
      .map((commit) => `- ${commit.sha.slice(0, 7)} ${commit.message} by ${commit.author?.name || 'unknown'} (${commit.changedFiles?.length || 0} files changed)`)
      .join('\n');

    return `You are an AI product analyst summarizing recent repository activity for ${repoContext.name}.

Repository: ${repoContext.name}
Owner: ${repoContext.owner}
Stack: ${this._stackSummary(repoContext.detectedStack)}
Total files: ${repoContext.totalFiles}

Recent commits:
${commitText}

Statistics:
- Total commits: ${stats.totalCommits}
- Files modified: ${stats.filesModified}
- Lines added: ${stats.linesAdded}
- Lines removed: ${stats.linesRemoved}
- New routes: ${stats.newRoutes}
- New models: ${stats.newModels}
- New components: ${stats.newComponents}

Respond with valid JSON only:
{
  "aiNarrative": "A concise summary of the repository activity and key changes.",
  "highlights": ["Top findings or risks"],
  "architectureChanges": ["High-level architecture shifts or impacted areas"]
}
`.trim();
  }

  _stackSummary(detectedStack) {
    if (!detectedStack) return 'Unknown';
    const all = [
      ...(detectedStack.frontend || []),
      ...(detectedStack.backend || []),
      ...(detectedStack.database || []),
    ];
    return all.join(', ') || 'Unknown';
  }
}

module.exports = new PromptBuilder();
