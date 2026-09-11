import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  // Verify owner authorization header
  const authHeader = req.headers['x-owner-auth'];

  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Owner authorization required.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // Retrieve the 50 most recent security logs
    const logs = await sql`
      SELECT username, action, ip_address, timestamp 
      FROM audit_logs 
      ORDER BY timestamp DESC 
      LIMIT 50;
    `;

    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Audit Logs API Error:', error);
    return res.status(500).json({ message: 'Failed to retrieve audit logs.' });
  }
}
