// Start Session
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
    console.error(err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Log Page View
app.post('/api/session/pageview', async (req, res) => {
  const { sessionId, page } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

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
    res.status(500).json({ error: 'Failed to log pageview' });
  }
});

// Heartbeat
app.post('/api/session/heartbeat', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions SET last_heartbeat = NOW() WHERE session_id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// End Session
app.post('/api/session/end', async (req, res) => {
  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) {}
  }
  const { sessionId } = payload || {};
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions SET ended_at = NOW(), status = 'ended' WHERE session_id = $1 AND ended_at IS NULL`,
      [sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// 3-Day History for Owner Panel
app.get('/api/owner/sessions', async (req, res) => {
  const authHeader = req.headers['x-owner-auth'];
  if (authHeader !== OWNER_SECRET) return res.status(403).json({ error: 'Unauthorized' });

  try {
    // Auto-timeout inactive sessions (>2m without heartbeat)
    await db.query(`
      UPDATE user_sessions SET ended_at = last_heartbeat, status = 'timed_out'
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

    res.json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
});
