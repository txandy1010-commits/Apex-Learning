import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, role, page } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const cleanUsername = username.trim().toLowerCase();

    await sql`
      INSERT INTO active_sessions (username, role, current_page, last_seen)
      VALUES (${cleanUsername}, ${role || 'user'}, ${page || 'Unknown'}, CURRENT_TIMESTAMP)
      ON CONFLICT (username) 
      DO UPDATE SET 
        last_seen = CURRENT_TIMESTAMP, 
        role = EXCLUDED.role,
        current_page = EXCLUDED.current_page;
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ message: 'Error updating activity' });
  }
}
