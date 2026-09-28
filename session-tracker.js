(function () {
  let currentSessionId = sessionStorage.getItem('active_session_id');

  function getUsername() {
    return localStorage.getItem('loggedUser') || localStorage.getItem('username') || 'Guest';
  }

  // Start or resume session & log page visit
  async function initSession() {
    const currentPath = window.location.pathname;

    if (!currentSessionId) {
      try {
        const res = await fetch('/api/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: getUsername(),
            page: currentPath
          })
        });
        const data = await res.json();
        if (data.sessionId) {
          currentSessionId = data.sessionId;
          sessionStorage.setItem('active_session_id', currentSessionId);
        }
      } catch (err) {
        console.error('Session start error:', err);
      }
    } else {
      // Session already active, log page navigation
      try {
        await fetch('/api/session/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            page: currentPath
          })
        });
      } catch (err) {
        console.error('Pageview log error:', err);
      }
    }
  }

  // Periodic heartbeat
  async function sendHeartbeat() {
    if (!currentSessionId) return;
    try {
      await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: currentSessionId })
      });
    } catch (err) {
      console.error('Heartbeat error:', err);
    }
  }

  // End session on close/leave
  function endSession() {
    if (!currentSessionId) return;
    const payload = JSON.stringify({ sessionId: currentSessionId });
    navigator.sendBeacon('/api/session/end', payload);
  }

  initSession();
  setInterval(sendHeartbeat, 15000); // Pulse every 15s

  window.addEventListener('pagehide', endSession);
  window.addEventListener('beforeunload', endSession);
})();
