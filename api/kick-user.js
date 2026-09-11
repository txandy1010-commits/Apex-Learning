import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const authHeader = req.headers['x-owner-auth'];

  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Owner authorization required.' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const cleanUsername = username.trim().toLowerCase();

    // 1. Insert into revoked_sessions table
    await sql`
      INSERT INTO revoked_sessions (username) 
      VALUES (${cleanUsername});
    `;

    // 2. Remove from active_sessions table immediately
    await sql`
      DELETE FROM active_sessions 
      WHERE LOWER(username) = ${cleanUsername};
    `;

    // 3. Write event to audit_logs table
    await sql`
      INSERT INTO audit_logs (username, action) 
      VALUES (${cleanUsername}, 'REMOTE_FORCE_LOGOUT');
    `;

    return res.status(200).json({ success: true, message: `Session revoked for ${cleanUsername}` });
  } catch (error) {
    console.error('Kick User Error:', error);
    return res.status(500).json({ message: 'Failed to revoke session.' });
  }
}
