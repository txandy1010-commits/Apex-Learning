import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    const authHeader = req.headers['x-owner-auth'];
    if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { message, targetUser, targetRole } = req.body;

    try {
      // Clear previous global or targeted banner
      await sql`DELETE FROM announcements;`;

      if (message) {
        await sql`
          INSERT INTO announcements (message, target_user, target_role)
          VALUES (${message}, ${targetUser || null}, ${targetRole || null});
        `;
      }

      return res.status(200).json({ success: true, message: 'Announcement updated.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT message, target_user, target_role FROM announcements LIMIT 1;`;
      if (rows.length > 0) {
        return res.status(200).json({ 
          success: true, 
          announcement: rows[0].message,
          targetUser: rows[0].target_user,
          targetRole: rows[0].target_role
        });
      }
      return res.status(200).json({ success: true, announcement: null });
    } catch (err) {
      return res.status(500).json({ message: 'Database error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
