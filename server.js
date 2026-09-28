const express = require('express');
const { Pool } = require('pg');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Use a connection pool for serverless durability
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Define your Owner Control Panel Auth Secret
const OWNER_SECRET = 'dfsgdsFDGFgdjfbljBLDJGSYsfsdfFGDGSGSDG';

// 1. Start Session
app.post('/api/session/start', async (req, res) => {
  const { username, page } = req.body;
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

    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('Session Start Error:', err);
    res.status(500).json({ success: false, error: 'Failed to start session' });
  }
});

// 2. Log Page View
app.post('/api/session/pageview', async (req, res) => {
  const { sessionId, page } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, error: 'Missing session ID' });

  try {
    await db.query(
      `INSERT INTO session_page_views (session_id, page, visited_at) VALUES ($1, $2, NOW())`,
      [sessionId, page || '/']
    );
    await db.query(
      `UPDATE user_sessions SET last_heartbeat = NOW() WHERE session_id = $1`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Pageview Error:', err);
    res.status(500).json({ success: false, error: 'Failed to log pageview' });
  }
});

// 3. Heartbeat
app.post('/api/session/heartbeat', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ success: false, error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions SET last_heartbeat = NOW() WHERE session_id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Heartbeat Error:', err);
    res.status(500).json({ success: false, error: 'Heartbeat failed' });
  }
});

// 4. End Session
app.post('/api/session/end', async (req, res) => {
  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) {}
  }
  const { sessionId } = payload || {};
  if (!sessionId) return res.status(400).json({ success: false, error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions SET ended_at = NOW(), status = 'ended' WHERE session_id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('End Session Error:', err);
    res.status(500).json({ success: false, error: 'Failed to end session' });
  }
});

// 5. 3-Day History for Owner Panel (Fixed Auth & Query Handling)
app.get('/api/owner/sessions', async (req, res) => {
  // Extract custom auth header
  const authHeader = req.headers['x-owner-auth'];

  if (!authHeader || authHeader !== OWNER_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Invalid Auth Header' });
  }

  try {
    // Automatically mark inactive sessions (>2 minutes without heartbeat) as timed out
    await db.query(`
      UPDATE user_sessions 
      SET ended_at = last_heartbeat, status = 'timed_out'
      WHERE ended_at IS NULL AND last_heartbeat < NOW() - INTERVAL '2 minutes'
    `);
module.exports = app;
    // Fetch session data alongside page transition history for the past 3 days
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

    res.json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error('Session History Fetch Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch session history' });
  }
});


