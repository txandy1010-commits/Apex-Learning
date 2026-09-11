import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  const authHeader = req.headers['x-owner-auth'];

  if (!authHeader || authHeader !== process.env.OWNER_SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden: Owner authorization required.' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    // GET: Return registered users AND high-level dashboard metrics
    if (req.method === 'GET') {
      const users = await sql`
        SELECT username, real_name, role, is_banned, created_at 
        FROM users 
        ORDER BY created_at DESC;
      `;

      const activeCount = await sql`
        SELECT COUNT(*) FROM active_sessions 
        WHERE last_seen > NOW() - INTERVAL '5 minutes';
      `;

      const auditCount = await sql`
        SELECT COUNT(*) FROM audit_logs 
        WHERE timestamp > NOW() - INTERVAL '24 hours';
      `;

      return res.status(200).json({
        success: true,
        users,
        metrics: {
          totalUsers: users.length,
          activeUsers: parseInt(activeCount[0].count, 10),
          logsToday: parseInt(auditCount[0].count, 10),
          dbStatus: 'Healthy'
        }
      });
    }

    // POST: Create a new user
    if (req.method === 'POST') {
      const { username, password, role } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required.' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const hashedPassword = await bcrypt.hash(password.toLowerCase(), 10);

      await sql`
        INSERT INTO users (username, password_hash, role)
        VALUES (${cleanUsername}, ${hashedPassword}, ${role || 'user'});
      `;

      return res.status(201).json({ success: true, message: 'User created.' });
    }

    // PUT: Update roles, real name, ban status, OR force-reset password
    if (req.method === 'PUT') {
      const { username, newRole, realName, newPassword, isBanned } = req.body;

      if (!username) {
        return res.status(400).json({ message: 'Username is required.' });
      }

      const cleanUsername = username.trim().toLowerCase();

      // If new password provided, hash and override
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword.toLowerCase(), 10);
        await sql`
          UPDATE users 
          SET password_hash = ${hashedPassword} 
          WHERE LOWER(username) = ${cleanUsername};
        `;
      }

      // Handle role, real_name, and ban toggles
      await sql`
        UPDATE users 
        SET 
          role = COALESCE(${newRole}, role),
          real_name = COALESCE(${realName}, real_name),
          is_banned = COALESCE(${isBanned}, is_banned)
        WHERE LOWER(username) = ${cleanUsername};
      `;

      return res.status(200).json({ success: true, message: 'User updated.' });
    }

    // DELETE: Delete user account
    if (req.method === 'DELETE') {
      const { username } = req.body;
      const cleanUsername = username.trim().toLowerCase();

      await sql`DELETE FROM users WHERE LOWER(username) = ${cleanUsername};`;
      await sql`DELETE FROM active_sessions WHERE LOWER(username) = ${cleanUsername};`;

      return res.status(200).json({ success: true, message: 'User deleted.' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Admin Users API Error:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
