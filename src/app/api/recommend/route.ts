import { NextRequest, NextResponse } from 'next/server';
import { recommendRequestSchema } from '@/lib/schemas';
import { getRecommendations } from '@/lib/llm';
import { verifyBook } from '@/lib/openLibrary';
import { ratelimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
    let success = true;
    try {
      if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_URL.includes('dummy')) {
        const result = await ratelimit.limit(ip);
        success = result.success;
      }
    } catch (e) {
      console.warn("Rate limit check failed (likely dummy credentials), allowing request.", e);
    }
    
    if (!success) {
      return NextResponse.json({ error: "Rate limit reached" }, { status: 429 });
    }

    const body = await req.json();
    const parsed = recommendRequestSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body", details: parsed.error }, { status: 400 });
    }

    const { prompt, excludeTitles = [] } = parsed.data;
    const llmOutput = await getRecommendations(prompt, excludeTitles);
    
    const verifiedCollections = await Promise.all(
      (llmOutput.collections || []).map(async (collection: any) => {
        const verifiedRecs = [];
        for (const rec of (collection.recommendations || [])) {
          const olData = await verifyBook(rec.title, rec.author);
          verifiedRecs.push({ ...rec, ...(olData || { coverUrl: null }) });
          // Add a small 100ms delay between requests to be polite to the API
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
    
  } catch (error) {
    console.error("Recommend API error:", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
