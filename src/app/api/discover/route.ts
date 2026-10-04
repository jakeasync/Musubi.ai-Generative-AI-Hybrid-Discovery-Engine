import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { verifyBook } from "@/lib/openLibrary";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  const modelName = (process.env.LLM_MODEL || "qwen/qwen3.8-27b").trim();

  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `You are a creative book curator.
Invent 2 highly specific, thrilling, or unusual book categories (e.g., "Gothic Botanical", "South Korean Tales").
Then recommend exactly 8 real, published books for EACH category.
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

CRITICAL RULE: If you are not 100% certain about the exact author or publication details, do NOT guess. Instead, leave the book out or write "UNKNOWN" for the author. It is better to recommend fewer books than to provide inaccurate metadata or hallucinated pairings.`
        }
      ],
      model: modelName,
      response_format: { type: "json_object" },
      max_tokens: 900,
    });

    const text = response.choices[0]?.message?.content;
    const parsed = JSON.parse(text || "{}");
    
    const verifiedCollections = await Promise.all(
      (parsed.collections || []).map(async (collection: any) => {
        const verifiedRecs = [];
        for (const rec of (collection.recommendations || [])) {
          const olData = await verifyBook(rec.title, rec.author);
          verifiedRecs.push({ ...rec, ...(olData || { coverUrl: null }) });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        return {
          categoryName: collection.categoryName,
          recommendations: verifiedRecs.filter(r => r.openLibraryKey).slice(0, 6)
        };
      })
    );

    const finalCollections = verifiedCollections.filter(c => c.recommendations.length > 0);

    return NextResponse.json({ collections: finalCollections });
  } catch (error: any) {
    console.error("Discover API Error:", error);
    return NextResponse.json({ error: "Failed to generate collection" }, { status: 500 });
  }
}
