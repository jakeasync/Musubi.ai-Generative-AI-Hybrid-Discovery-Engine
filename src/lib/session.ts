import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function getSessionId() {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get('session_id')?.value;
  
  if (!sessionId) {
    sessionId = uuidv4();
    cookieStore.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }
  return sessionId;
}
