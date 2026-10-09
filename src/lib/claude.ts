const API_URL = "https://api.anthropic.com/v1/messages";

export const CLAUDE_MODEL = (process.env.LLM_MODEL || "claude-haiku-4-5-20251001").trim();

/** Calls the Anthropic Messages API and returns the text of the reply. */
export async function claudeComplete(opts: {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": (process.env.ANTHROPIC_API_KEY || "").trim(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: opts.maxTokens ?? 1500,
      temperature: opts.temperature ?? 0.2,
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.content?.find((b: any) => b.type === "text")?.text ?? "";
}

/** Claude has no JSON mode, so pull the first JSON object out of the reply. */
export function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : "{}");
}
