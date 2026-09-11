import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, role } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const cleanUsername = username.trim().toLowerCase();

    // Update last_seen if user exists, or insert if they don't
    await sql`
      INSERT INTO active_sessions (username, role, last_seen)
      VALUES (${cleanUsername}, ${role || 'user'}, CURRENT_TIMESTAMP)
      ON CONFLICT (username) 
      DO UPDATE SET last_seen = CURRENT_TIMESTAMP, role = EXCLUDED.role;
    `;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    return res.status(500).json({ message: 'Error updating activity' });
  }
}
