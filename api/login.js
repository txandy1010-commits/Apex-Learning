// api/login.js
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  try {
    // Connect to Neon using the environment variable
    const sql = neon(process.env.DATABASE_URL);

    // Fetch the user by username
    const rows = await sql`
      SELECT * FROM users WHERE LOWER(username) = ${username.toLowerCase()} LIMIT 1
    `;

    const user = rows[0];

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Verify hashed password
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // Login successful
    return res.status(200).json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}