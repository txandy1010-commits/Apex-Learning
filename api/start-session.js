import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { username, page } = req.body || {};

  if (!username) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ success: false, message: 'Missing DATABASE_URL' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    await sql`
      UPDATE user_sessions 
      SET ended_at = NOW(), status = 'expired'
      WHERE username = ${username} AND ended_at IS NULL AND started_at < NOW() - INTERVAL '15 minutes';
    `;

    const activeSessions = await sql`
      SELECT id FROM user_sessions 
      WHERE username = ${username} AND ended_at IS NULL 
      LIMIT 1;
    `;

    let sessionId;

    if (activeSessions.length > 0) {
      sessionId = activeSessions[0].id;
    } else {
      const newSession = await sql`
        INSERT INTO user_sessions (username, started_at, status)
        VALUES (${username}, NOW(), 'active')
        RETURNING id;
      `;
      sessionId = newSession[0].id;
    }

    if (page) {
      await sql`
        INSERT INTO page_views (session_id, page, visited_at)
        VALUES (${sessionId}, ${page}, NOW());
      `;
    }

    return res.status(200).json({
      success: true,
      sessionId: sessionId,
      message: 'Session recorded successfully'
    });

  } catch (error) {
    console.error('Session start error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
