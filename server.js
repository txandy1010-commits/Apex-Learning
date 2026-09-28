// ==========================================
// SESSION TRACKING ENDPOINTS
// ==========================================

// 1. Start a new session
app.post('/api/session/start', async (req, res) => {
  const { username, page } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const result = await db.query(
      `INSERT INTO user_sessions (username, last_page, ip_address, started_at, last_heartbeat, status)
       VALUES ($1, $2, $3, NOW(), NOW(), 'active')
       RETURNING session_id`,
      [username || 'Guest', page || '/']
    );

    res.json({ success: true, sessionId: result.rows[0].session_id });
  } catch (err) {
    console.error('Error starting session:', err);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// 2. Pulse heartbeat
app.post('/api/session/heartbeat', async (req, res) => {
  const { sessionId, page } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions 
       SET last_heartbeat = NOW(), last_page = COALESCE($1, last_page)
       WHERE session_id = $2 AND ended_at IS NULL`,
      [page, sessionId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error updating heartbeat:', err);
    res.status(500).json({ error: 'Heartbeat update failed' });
  }
});

// 3. End session (called when closing tab / navigating away)
app.post('/api/session/end', async (req, res) => {
  // Support both JSON body and navigator.sendBeacon stringified payload
  let payload = req.body;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch (e) {}
  }
  
  const { sessionId } = payload;
  if (!sessionId) return res.status(400).json({ error: 'Missing session ID' });

  try {
    await db.query(
      `UPDATE user_sessions 
       SET ended_at = NOW(), status = 'ended'
       WHERE session_id = $1 AND ended_at IS NULL`,
      [sessionId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error ending session:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// 4. Fetch 3-Day Session History for Owner Panel
app.get('/api/owner/sessions', async (req, res) => {
  try {
    // Auto-close stale sessions (no heartbeat for > 2 minutes)
    await db.query(`
      UPDATE user_sessions
      SET ended_at = last_heartbeat, status = 'timed_out'
      WHERE ended_at IS NULL 
        AND last_heartbeat < NOW() - INTERVAL '2 minutes'
    `);

    // Fetch sessions from the last 3 days
    const result = await db.query(`
      SELECT 
        session_id,
        username,
        started_at,
        ended_at,
        last_heartbeat,
        last_page,
        ip_address,
        status,
        ROUND(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))) AS duration_seconds
      FROM user_sessions
      WHERE started_at >= NOW() - INTERVAL '3 days'
      ORDER BY started_at DESC
    `);

    res.json({ success: true, sessions: result.rows });
  } catch (err) {
    console.error('Error fetching session history:', err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});
