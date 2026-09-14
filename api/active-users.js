import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Validate Owner Authorization Header
  const authHeader = req.headers['x-owner-auth'];
  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Filter using epoch differences (900 seconds = 15 minutes)
    const sessions = await sql`
      SELECT 
        username, 
        role, 
        current_page AS page, 
        last_seen 
      FROM active_sessions 
      WHERE EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - last_seen)) < 900
      ORDER BY last_seen DESC;
    `;

    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('Active users query error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}
