import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionId } from '@/lib/session';
import { readingListSchema } from '@/lib/schemas';

export async function GET() {
  try {
    const sessionId = await getSessionId();
    const [rows] = await pool.query(
      'SELECT id, title, author, cover_url as coverUrl, open_library_key as openLibraryKey, created_at as createdAt FROM reading_list WHERE session_id = ? ORDER BY created_at DESC',
      [sessionId]
    );
    return NextResponse.json(rows);
  } catch (error) {
    console.error("DB GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const parsed = readingListSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    
    const { title, author, coverUrl, openLibraryKey } = parsed.data;
    
    await pool.query(
      'INSERT INTO reading_list (session_id, title, author, cover_url, open_library_key) VALUES (?, ?, ?, ?, ?)',
      [sessionId, title, author, coverUrl, openLibraryKey]
    );
    
    return NextResponse.json({ message: "Saved" }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: "Already saved" }, { status: 409 });
    }
    console.error("DB POST Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
