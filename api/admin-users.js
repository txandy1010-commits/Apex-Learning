import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  // 1. Verify owner authorization header
  const authHeader = req.headers['x-owner-auth'];

  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Owner authorization required.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // GET: Retrieve all registered users
    if (req.method === 'GET') {
      const users = await sql`
        SELECT username, role, created_at 
        FROM users 
        ORDER BY created_at DESC;
      `;
      return res.status(200).json({ success: true, users });
    }

    // POST: Create a new user account
    if (req.method === 'POST') {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanPassword = password.toLowerCase();

      const existing = await sql`SELECT * FROM users WHERE LOWER(username) = ${cleanUsername}`;
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Username already exists.' });
      }

      const hashedPassword = await bcrypt.hash(cleanPassword, 10);
      const userRole = role || 'user';

      await sql`
        INSERT INTO users (username, password_hash, role)
        VALUES (${cleanUsername}, ${hashedPassword}, ${userRole});
      `;

      return res.status(201).json({ success: true, message: 'User created successfully.' });
    }

    // PUT: Update user role
    if (req.method === 'PUT') {
      const { username, newRole } = req.body;

      if (!username || !newRole) {
        return res.status(400).json({ message: 'Username and newRole are required.' });
      }

      const cleanUsername = username.trim().toLowerCase();

      await sql`
        UPDATE users 
        SET role = ${newRole} 
        WHERE LOWER(username) = ${cleanUsername};
      `;

      await sql`
        UPDATE active_sessions 
        SET role = ${newRole} 
        WHERE LOWER(username) = ${cleanUsername};
      `;

      return res.status(200).json({ success: true, message: 'Role updated successfully.' });
    }

    // DELETE: Delete user account
    if (req.method === 'DELETE') {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ message: 'Username is required.' });
      }

      const cleanUsername = username.trim().toLowerCase();

      await sql`DELETE FROM users WHERE LOWER(username) = ${cleanUsername};`;
      await sql`DELETE FROM active_sessions WHERE LOWER(username) = ${cleanUsername};`;

      return res.status(200).json({ success: true, message: 'User deleted successfully.' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin Users API error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
