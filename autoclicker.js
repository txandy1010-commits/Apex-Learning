(function () {
  let active = false;
  let clickInterval = null;
  let mouseX = 0;
  let mouseY = 0;

  // Visual Indicator Setup
  const statusIndicator = document.createElement('div');
  statusIndicator.id = 'autoclicker-status';
  statusIndicator.innerHTML = 'Auto-Clicker: OFF (Press ` to toggle)';
  Object.assign(statusIndicator.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    color: '#ff4d4d',
    fontFamily: 'monospace',
    fontSize: '12px',
    borderRadius: '4px',
    zIndex: '999999',
    pointerEvents: 'none',
    border: '1px solid #444'
  });
  document.body.appendChild(statusIndicator);

  function triggerClick(x, y) {
    const target = document.elementFromPoint(x, y);
    if (target) {
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
    }
  }

  function startClicking() {
    if (!clickInterval) {
      clickInterval = setInterval(() => {
        triggerClick(mouseX, mouseY);
      }, 0);
    }
  }

  function stopClicking() {
    if (clickInterval) {
      clearInterval(clickInterval);
      clickInterval = null;
    }
  }

  // Update cursor position continuously
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  window.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = e.touches[0].clientX;
      mouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Toggle on Backtick (`) Key
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.code === 'Backquote') {
      active = !active;
      if (active) {
        statusIndicator.innerHTML = 'Auto-Clicker: ON (Press ` to toggle)';
        statusIndicator.style.color = '#00ff66';
        startClicking();
      } else {
        statusIndicator.innerHTML = 'Auto-Clicker: OFF (Press ` to toggle)';
        statusIndicator.style.color = '#ff4d4d';
        stopClicking();
      }
    }
  });
})();
