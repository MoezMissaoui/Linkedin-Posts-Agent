// Postilys — assemble the system prompt for the LLM from structured user
// fields. The locked sections (JSON output, anti-duplication protocol, code
// formatting rules) live here, NOT in the database.
//
// Whenever the agent is saved in "assistant" mode, the application calls
// `assembleSystemPrompt(fields)` and writes the result into
// `agents.prompt_system`. n8n keeps reading that column unchanged.

export type PromptFields = {
  role: string;
  topic: string;
  audience: string;
  hookEmoji: string;
  hookPrefix: string;
  footer: string;
  hasCode: boolean;
  codeLanguage: string;
};

const DEFAULTS: PromptFields = {
  role: "an expert practitioner with deep, real-world experience in your field",
  topic: "your domain",
  audience: "your audience",
  hookEmoji: "💡",
  hookPrefix: "Tip",
  footer:
    "➤ Sharing real-production tips. Let's grow together 🤝\n🔔 Follow me for more insights!",
  hasCode: true,
  codeLanguage: "TypeScript",
};

function nonEmpty(value: string | null | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  return v.length > 0 ? v : fallback;
}

export function assembleSystemPrompt(input: Partial<PromptFields>): string {
  const f: PromptFields = {
    role: nonEmpty(input.role, DEFAULTS.role),
    topic: nonEmpty(input.topic, DEFAULTS.topic),
    audience: nonEmpty(input.audience, DEFAULTS.audience),
    hookEmoji: nonEmpty(input.hookEmoji, DEFAULTS.hookEmoji),
    hookPrefix: nonEmpty(input.hookPrefix, DEFAULTS.hookPrefix),
    footer: nonEmpty(input.footer, DEFAULTS.footer),
    hasCode: input.hasCode ?? DEFAULTS.hasCode,
    codeLanguage: nonEmpty(input.codeLanguage, DEFAULTS.codeLanguage),
  };

  const codeBlock = f.hasCode
    ? `## FORMATTING RULES FOR "raw_code"
- Provide the code in a strict "Before ❌" and "After ✅" format.
- DO NOT wrap the code in markdown code blocks (no \`\`\`).
- Provide only the raw ${f.codeLanguage} code as plain text — this string will be sent directly to a CLI tool to generate an image.
- IMPORTANT: Use ONLY single quotes ('') for strings within the code to avoid JSON escaping issues.`
    : `## "raw_code"
This topic does not require a code snippet. Always set "raw_code" to an empty string "".`;

  return `You are ${f.role}.

## 🛡️ ANTI-DUPLICATION PROTOCOL (CRITICAL)
Before generating the tip, you MUST use your Supabase tool to fetch the history of published posts.
1. Call the Supabase tool to get the \`post_text\` of existing rows where \`is_published\` is TRUE.
2. Analyze the retrieved history.
3. If a very similar tip has already been published, you MUST pivot to a more advanced, niche, or different angle of that topic to ensure 100% uniqueness.
4. Do not repeat concepts already present in the database.

## YOUR TASK
Generate exactly 1 and only 1 advanced, highly actionable ${f.topic} tip tailored for ${f.audience}.

## INSTRUCTIONS
1. Generate exactly 1 and only 1 tip per execution.
2. The output MUST be a strict, valid JSON array of objects. Do not include any markdown formatting like \`\`\`json or intro/outro text. Just the raw JSON.
3. Each object in the JSON array must have exactly two keys: "post_text" and "raw_code".

## FORMATTING RULES FOR "post_text"
- Start with a hook using the ${f.hookEmoji} emoji and "${f.hookPrefix}: ".
- Explain the problem and the solution in 2 to 3 concise sentences. Focus on the "Why" (impact, clarity, performance).
- Always include this exact footer at the end:

${f.footer}

${codeBlock}

IMPORTANT: Generate genuinely new content. Do not reproduce verbatim any example or template.`;
}
