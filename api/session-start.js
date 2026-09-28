const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, page } = req.body || {};
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const sessionRes = await db.query(
      `INSERT INTO user_sessions (username, ip_address, started_at, last_heartbeat, status)
       VALUES ($1, $2, NOW(), NOW(), 'active') RETURNING session_id`,
      [username || 'Guest', ip]
    );

    const sessionId = sessionRes.rows[0].session_id;

    await db.query(
      `INSERT INTO session_page_views (session_id, page, visited_at) VALUES ($1, $2, NOW())`,
      [sessionId, page || '/']
    );

    return res.status(200).json({ success: true, sessionId });
  } catch (err) {
    console.error('Session Start Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to start session' });
  }
};
