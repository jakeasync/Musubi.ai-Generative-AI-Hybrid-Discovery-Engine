import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSessionId } from '@/lib/session';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionId = await getSessionId();
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    await pool.query(
      'DELETE FROM reading_list WHERE id = ? AND session_id = ?',
      [id, sessionId]
    );
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DB DELETE Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
