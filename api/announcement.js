import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);

  // GET: Fetch all active banners or a single targeted banner for the client
  if (req.method === 'GET') {
    try {
      const mode = req.query.mode;

      // Admin mode: Fetch all active banners for the Owner Panel list
      if (mode === 'all') {
        const authHeader = req.headers['x-owner-auth'];
        if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        const banners = await sql`SELECT * FROM announcements ORDER BY created_at DESC;`;
        return res.status(200).json({ success: true, banners });
      }

      // Client mode: Fetch banners for standard users
      const banners = await sql`SELECT * FROM announcements ORDER BY created_at DESC;`;
      return res.status(200).json({ success: true, banners });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Database error' });
    }
  }

  // Owner Authorization Check for Modifications (POST, PUT, DELETE)
  const authHeader = req.headers['x-owner-auth'];
  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  // POST: Create a new banner
  if (req.method === 'POST') {
    const { message, targetUser, targetRole } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    try {
      await sql`
        INSERT INTO announcements (message, target_user, target_role)
        VALUES (${message}, ${targetUser || null}, ${targetRole || null});
      `;
      return res.status(200).json({ success: true, message: 'Banner created successfully.' });
    } catch (err) {
      return res.status(500).json({ message: 'Database error' });
    }
  }

  // PUT: Update an existing banner by ID
  if (req.method === 'PUT') {
    const { id, message, targetUser, targetRole } = req.body;
    if (!id || !message) return res.status(400).json({ message: 'ID and message are required.' });

    try {
      await sql`
        UPDATE announcements
        SET message = ${message},
            target_user = ${targetUser || null},
            target_role = ${targetRole || null}
        WHERE id = ${id};
      `;
      return res.status(200).json({ success: true, message: 'Banner updated successfully.' });
    } catch (err) {
      return res.status(500).json({ message: 'Database error' });
    }
  }

  // DELETE: Remove a specific banner by ID
  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'Banner ID is required.' });

    try {
      await sql`DELETE FROM announcements WHERE id = ${id};`;
      return res.status(200).json({ success: true, message: 'Banner removed successfully.' });
    } catch (err) {
      return res.status(500).json({ message: 'Database error' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
