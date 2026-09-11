import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, role, page } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const cleanUsername = username.trim().toLowerCase();

    // 1. Check if user session has been revoked by owner
    const revoked = await sql`
      SELECT * FROM revoked_sessions 
      WHERE LOWER(username) = ${cleanUsername};
    `;

    if (revoked.length > 0) {
      // Clear revocation entry so it doesn't loop unnecessarily
      await sql`
        DELETE FROM revoked_sessions 
        WHERE LOWER(username) = ${cleanUsername};
      `;
      return res.status(401).json({ 
        success: false, 
        revoked: true, 
        message: 'Session terminated by owner.' 
      });
    }

    // 2. Upsert active session status
    await sql`
      INSERT INTO active_sessions (username, role, current_page, last_seen)
      VALUES (${cleanUsername}, ${role || 'user'}, ${page || '/'}, NOW())
      ON CONFLICT (username) 
      DO UPDATE SET 
        role = EXCLUDED.role,
        current_page = EXCLUDED.current_page,
        last_seen = NOW();
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Heartbeat Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
