(function () {
  let currentSessionId = sessionStorage.getItem('active_session_id');

  function getUsername() {
    return localStorage.getItem('loggedUser') || localStorage.getItem('username') || 'Guest';
  }

  // Start Session
  async function initSession() {
    if (currentSessionId) return; // Session already initialized in this tab

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: getUsername(),
          page: window.location.pathname
        })
      });
      const data = await res.json();
      if (data.sessionId) {
        currentSessionId = data.sessionId;
        sessionStorage.setItem('active_session_id', currentSessionId);
      }
    } catch (err) {
      console.error('Failed to initiate session:', err);
    }
  }

  // Send Heartbeat
  async function sendHeartbeat() {
    if (!currentSessionId) return;
    try {
      await fetch('/api/session/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          page: window.location.pathname
        })
      });
    } catch (err) {
      console.error('Heartbeat failed:', err);
    }
  }

  // End Session on Tab Close / Exit
  function endSession() {
    if (!currentSessionId) return;
    const payload = JSON.stringify({ sessionId: currentSessionId });
    navigator.sendBeacon('/api/session/end', payload);
  }

  // Lifecycle Bindings
  initSession();
  setInterval(sendHeartbeat, 15000); // Heartbeat every 15s

  window.addEventListener('pagehide', endSession);
  window.addEventListener('beforeunload', endSession);
})();
