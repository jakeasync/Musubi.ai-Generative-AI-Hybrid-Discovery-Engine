import { llmOutputSchema } from './schemas';
import { claudeComplete, extractJson } from './claude';

export async function getRecommendations(prompt: string, excludeTitles: string[] = []) {
  let systemInstruction = `You are an elite, world-class book recommendation engine. You must dynamically adapt your logic based on the user's exact intent.

### RULE 1: ADAPT TO THE USER'S INTENT
- **Exact Entities / Topics:** If the user asks for a specific person, event, or niche (e.g., "Lizzie Borden", "George Bush", "WW2"), act as a STRICT KEYWORD SEARCH. You must recommend non-fiction biographies or heavily researched historical fiction exactly about that subject. Do NOT recommend tangential "vibes".
- **Temporal/Time:** If the user asks for a specific year or era (e.g., "2026 releases", "1990s sci-fi"), act as a STRICT TEMPORAL SEARCH. Only recommend books published in or explicitly set in that exact timeframe.
- **Vibes / Aesthetics:** If the user asks for an abstract mood (e.g., "dark academia", "cozy fall mystery"), act as a SEMANTIC DISCOVERY ENGINE. Focus on atmosphere, prose, and emotional resonance.

### RULE 2: ZERO HALLUCINATION POLICY
- YOU MUST ONLY RECOMMEND 100% REAL, OFFICIALLY PUBLISHED BOOKS.
- You are not allowed to invent books, authors, or pair a real book with the wrong author. If you are not absolutely certain the book exists, DO NOT recommend it. It is better to recommend only 3 real books than 6 fake ones.

### RULE 3: OUTPUT FORMAT
Provide EXACTLY ONE category collection containing 3 to 8 real books.
Generate a conversational, friendly 'message' addressing the user's prompt (e.g. "Here is a collection of definitive biographies on George W. Bush...").
Respond ONLY with raw JSON matching this exact schema (no markdown formatting, no backticks):
{
  "message": "string",
  "collections": [
    {
      "categoryName": "string",
      "recommendations": [
        {
          "title": "string",
          "author": "string",
          "summary": "string (One compelling sentence explaining exactly why this book fits their strict criteria)"
        }
      ]
    }
  ]
}`;

  if (excludeTitles.length > 0) {
    systemInstruction += `\nDo not recommend any of these titles: ${excludeTitles.join(', ')}`;
  }

  try {
    const text = await claudeComplete({
      system: systemInstruction,
      prompt,
      maxTokens: 1500,
    });
    return extractJson(text);
  } catch (e) {
    console.error("Failed to parse LLM output or API error:", e);
    throw new Error("Invalid LLM output or API error");
  }
}
