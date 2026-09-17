import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Connect to Neon using your environment variable
    const sql = neon(process.env.DATABASE_URL);

    // Fetch all usernames from your users table
    const rows = await sql`SELECT username FROM users ORDER BY username ASC`;

    // Extract usernames into a simple array
    const users = rows.map(row => row.username);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users from Neon:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
