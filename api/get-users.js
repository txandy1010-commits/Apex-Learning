import { sql } from '@neondatabase/serverless';

export default async function handler(req, res) {
  try {
    // Queries all usernames from your Neon database table
    const users = await sql`SELECT username FROM users ORDER BY username ASC`;
    const usernames = users.map(u => u.username);
    
    return res.status(200).json({ users: usernames });
  } catch (error) {
    console.error('Error fetching users from Neon:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}
