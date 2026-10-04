import { llmOutputSchema } from './schemas';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function getRecommendations(prompt: string, excludeTitles: string[] = []) {
  let systemInstruction = `You are a Netflix-style book recommendation engine.
Analyze the user's prompt carefully:
1. If the prompt looks like an author's name (e.g., "John Wicks Collection"), recommend books BY THAT AUTHOR or highly similar authors.
2. If the prompt is a specific book title (e.g., "Lizzie Borden"), recommend that book and other similar books or books by the same author.
3. If the prompt is a mood or theme (e.g., "The bad girl in paris"), recommend books that fit that exact mood.

Create 3 highly specific, creative book categories. The first category MUST match the user's prompt directly, and the other 2 should be related, similar, or tangential categories.
For EACH category, recommend exactly 8 real, published books.
Respond ONLY with JSON matching this schema:
{
  "collections": [
    {
      "categoryName": "string",
      "recommendations": [
        {
          "title": "string",
          "author": "string"
        }
      ]
    }
  ]
}
No markdown formatting, just raw JSON.

CRITICAL RULE: If you are not 100% certain about the exact author or publication details, do NOT guess. Instead, leave the book out or write "UNKNOWN" for the author. It is better to recommend fewer books than to provide inaccurate metadata or hallucinated pairings.`;

  if (excludeTitles.length > 0) {
    systemInstruction += `\nDo not recommend any of these titles: ${excludeTitles.join(', ')}`;
  }

  const modelName = (process.env.LLM_MODEL || "qwen/qwen3.8-27b").trim();

  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      model: modelName,
      response_format: { type: "json_object" },
      max_tokens: 900,
    });

    const text = response.choices[0]?.message?.content;
    const parsed = JSON.parse(text || "{}");
    return parsed;
  } catch (e) {
    console.error("Failed to parse LLM output or API error:", e);
    throw new Error("Invalid LLM output or API error");
  }
}
