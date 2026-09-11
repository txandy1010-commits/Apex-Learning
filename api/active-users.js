import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Fetch users active within the last 2 minutes
    const activeUsers = await sql`
      SELECT username, role, current_page, last_seen 
      FROM active_sessions 
      WHERE last_seen >= NOW() - INTERVAL '2 minutes'
      ORDER BY last_seen DESC;
    `;

    return res.status(200).json({ success: true, users: activeUsers });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return res.status(500).json({ message: 'Error retrieving active sessions.' });
  }
}
