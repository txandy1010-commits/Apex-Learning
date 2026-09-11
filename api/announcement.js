import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    const sql = neon(process.env.DATABASE_URL);

    // GET: Fetch active announcement for all users (public)
    if (req.method === 'GET') {
      const active = await sql`
        SELECT message FROM announcements 
        WHERE is_active = TRUE 
        ORDER BY created_at DESC 
        LIMIT 1;
      `;
      return res.status(200).json({ 
        success: true, 
        announcement: active.length > 0 ? active[0].message : null 
      });
    }

    // Owner authorization required for modification
    const authHeader = req.headers['x-owner-auth'];
    if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
      return res.status(403).json({ message: 'Forbidden: Owner authorization required.' });
    }

    // POST: Set or update the current site banner
    if (req.method === 'POST') {
      const { message } = req.body;

      // Deactivate all previous announcements
      await sql`UPDATE announcements SET is_active = FALSE;`;

      if (message && message.trim().length > 0) {
        await sql`
          INSERT INTO announcements (message, is_active) 
          VALUES (${message.trim()}, TRUE);
        `;
      }

      return res.status(200).json({ success: true, message: 'Announcement updated.' });
    }

    // DELETE: Clear/Disable current announcement
    if (req.method === 'DELETE') {
      await sql`UPDATE announcements SET is_active = FALSE;`;
      return res.status(200).json({ success: true, message: 'Announcement cleared.' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Announcement API Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
