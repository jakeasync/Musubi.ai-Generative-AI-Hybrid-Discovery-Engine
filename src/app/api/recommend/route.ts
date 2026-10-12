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
    
    try {
      const backendRes = await fetch("http://localhost:8000/api/v1/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt, exclude_titles: excludeTitles }),
        signal: AbortSignal.timeout(35000),
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        const payload = backendData.data;
        if (payload && payload.collections) {
          return NextResponse.json({ message: payload.message, collections: payload.collections });
        }
      }
    } catch (backendErr) {
      console.warn("FastAPI service offline, falling back to Next.js pipeline:", backendErr);
    }

    const rawResult = await getRecommendations(prompt, excludeTitles);
    const collections = await Promise.all(
      (rawResult.collections || []).map(async (collection: any) => {
        const verifiedRecs = await Promise.all(
          (collection.recommendations || []).map(async (rec: any) => {
            const olData = await verifyBook(rec.title, rec.author);
            return {
              ...rec,
              ...(olData || { coverUrl: null }),
            };
          })
        );
        return {
          categoryName: collection.categoryName,
          recommendations: verifiedRecs,
        };
      })
    );

    return NextResponse.json({ message: rawResult.message, collections });
  } catch (error) {
    console.error("Recommend API error:", error);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
