const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const OWNER_SECRET = 'dfsgdsFDGFgdjfbljBLDJGSYsfsdfFGDGSGSDG';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-owner-auth');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const authHeader = req.headers['x-owner-auth'];
  if (!authHeader || authHeader !== OWNER_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Auth Header' });
  }

  try {
    await db.query(`
      UPDATE user_sessions 
      SET ended_at = last_heartbeat, status = 'timed_out'
      WHERE ended_at IS NULL AND last_heartbeat < NOW() - INTERVAL '2 minutes'
    `);

    const result = await db.query(`
      SELECT 
        s.session_id,
        s.username,
        s.started_at,
        s.ended_at,
        s.last_heartbeat,
        s.status,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))) AS duration_seconds,
        COALESCE(
          json_agg(
            json_build_object('page', pv.page, 'visited_at', pv.visited_at) 
            ORDER BY pv.visited_at ASC
          ) FILTER (WHERE pv.id IS NOT NULL), '[]'
        ) AS page_history
      FROM user_sessions s
      LEFT JOIN session_page_views pv ON s.session_id = pv.session_id
      WHERE s.started_at >= NOW() - INTERVAL '3 days'
      GROUP BY s.session_id
      ORDER BY s.started_at DESC
    `);

    return res.status(200).json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error('Session History Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch session history' });
  }
};
