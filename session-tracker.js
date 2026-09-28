(function () {
  let currentSessionId = sessionStorage.getItem('active_session_id');

  function getUsername() {
    return localStorage.getItem('loggedUser') || localStorage.getItem('username') || 'Guest';
  }

  // 1. Start Session
  async function initSession() {
    if (currentSessionId) return;

    try {
      const res = await fetch('/api/session-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: getUsername(),
          page: window.location.pathname
        })
      });

      const data = await res.json();
      if (data.success && data.sessionId) {
        currentSessionId = data.sessionId;
        sessionStorage.setItem('active_session_id', currentSessionId);
      } else {
        console.error('Session start error:', data.error);
      }
    } catch (err) {
      console.error('Failed to initiate session:', err);
    }
  }

  // 2. Send Heartbeat
  async function sendHeartbeat() {
    if (!currentSessionId) return;
    try {
      await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId })
      });
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }

  // 3. End Session on Exit
  function endSession() {
    if (!currentSessionId) return;
    const payload = JSON.stringify({ sessionId: currentSessionId });
    navigator.sendBeacon('/api/session-end', payload);
  }

  // Execute Tracking
  initSession();
  setInterval(sendHeartbeat, 15000); // Pulse every 15 seconds

  window.addEventListener('pagehide', endSession);
  window.addEventListener('beforeunload', endSession);
})();
