// autoclicker.js
(function() {
    if (window.__autoClickerLoaded) {
        alert("Auto-Clicker is already running!");
        return;
    }
    window.__autoClickerLoaded = true;

    let active = false,
        intervalId = null,
        clickInterval = 50,
        targetX = window.innerWidth / 2,
        targetY = window.innerHeight / 2,
        holdMode = false,
        isHolding = false,
        followCursor = false;

    const panel = document.createElement('div');
    panel.id = 'ac-ui-panel';
    panel.style.cssText = 'position:fixed;top:20px;right:20px;width:210px;background:#1e1e2f;color:#fff;padding:12px;border-radius:10px;box-shadow:0 8px 16px rgba(0,0,0,0.4);z-index:999999;font-family:sans-serif;font-size:13px;user-select:none;';
    panel.innerHTML = `
        <div style="font-weight:bold;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <span>Auto-Clicker</span>
            <button id="ac-close" style="background:none;border:none;color:#999;cursor:pointer;">✕</button>
        </div>
        <button id="ac-target" style="width:100%;padding:6px;margin-bottom:6px;background:#383854;color:#fff;border:none;border-radius:4px;cursor:pointer;">Set Fixed Position</button>
        <div style="margin-bottom:6px;">
            <label>Speed (ms): </label>
            <input id="ac-speed" type="number" value="50" min="5" style="width:55px;background:#111;color:#fff;border:1px solid #444;border-radius:3px;padding:2px;">
        </div>
        <div style="margin-bottom:4px;">
            <label style="cursor:pointer;"><input id="ac-follow-cursor" type="checkbox" style="margin-right:6px;">Follow Cursor / Touch</label>
        </div>
        <div style="margin-bottom:8px;">
            <label style="cursor:pointer;"><input id="ac-hold-mode" type="checkbox" style="margin-right:6px;">Hold to Click Mode</label>
        </div>
        <button id="ac-toggle" style="width:100%;padding:8px;background:#4CAF50;color:#fff;border:none;border-radius:4px;font-weight:bold;cursor:pointer;">START</button>
    `;
    document.body.appendChild(panel);

    const reticle = document.createElement('div');
    reticle.style.cssText = 'position:fixed;width:20px;height:20px;border:2px solid #ff0055;border-radius:50%;pointer-events:none;z-index:999998;transform:translate(-50%,-50%);display:none;';
    document.body.appendChild(reticle);

    function updateReticle() {
        if (followCursor) {
            reticle.style.display = 'none';
            return;
        }
        reticle.style.left = targetX + 'px';
        reticle.style.top = targetY + 'px';
        reticle.style.display = 'block';
    }

    const btnToggle = document.getElementById('ac-toggle'),
        btnTarget = document.getElementById('ac-target'),
        btnClose = document.getElementById('ac-close'),
        inputSpeed = document.getElementById('ac-speed'),
        chkHoldMode = document.getElementById('ac-hold-mode'),
        chkFollowCursor = document.getElementById('ac-follow-cursor');

    let selecting = false;

    btnTarget.addEventListener('click', function() {
        if (followCursor) return;
        selecting = true;
        btnTarget.textContent = 'Tap screen position...';
    });

    window.addEventListener('pointermove', function(e) {
        if (followCursor && !panel.contains(e.target)) {
            targetX = e.clientX;
            targetY = e.clientY;
        }
    }, true);

    window.addEventListener('pointerdown', function(e) {
        if (panel.contains(e.target)) return;
        if (followCursor) {
            targetX = e.clientX;
            targetY = e.clientY;
        }
        if (selecting) {
            targetX = e.clientX;
            targetY = e.clientY;
            selecting = false;
            btnTarget.textContent = 'Position Set!';
            updateReticle();
            setTimeout(() => btnTarget.textContent = 'Set Fixed Position', 1500);
            return;
        }
        if (holdMode && active) {
            isHolding = true;
            startClicking();
        }
    }, true);

    window.addEventListener('pointerup', function() {
        if (holdMode && isHolding) {
            isHolding = false;
            stopClicking();
        }
    }, true);

    function doClick() {
        const el = document.elementFromPoint(targetX, targetY);
        if (el && !panel.contains(el)) {
            const opts = { bubbles: true, cancelable: true, clientX: targetX, clientY: targetY, button: 0, pointerId: 1, pointerType: 'touch', isPrimary: true };
            el.dispatchEvent(new PointerEvent('pointerdown', opts));
            el.dispatchEvent(new MouseEvent('mousedown', opts));
            el.dispatchEvent(new PointerEvent('pointerup', opts));
            el.dispatchEvent(new MouseEvent('mouseup', opts));
            el.dispatchEvent(new MouseEvent('click', opts));
        }
    }

    function startClicking() {
        if (intervalId) clearInterval(intervalId);
        clickInterval = parseInt(inputSpeed.value, 10) || 50;
        intervalId = setInterval(doClick, clickInterval);
    }

    function stopClicking() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    chkFollowCursor.addEventListener('change', function() {
        followCursor = chkFollowCursor.checked;
        btnTarget.disabled = followCursor;
        btnTarget.style.opacity = followCursor ? '0.5' : '1';
        updateReticle();
    });

    chkHoldMode.addEventListener('change', function() {
        holdMode = chkHoldMode.checked;
        stopClicking();
        if (holdMode) {
            btnToggle.textContent = 'HOLD SCREEN TO SPAM';
            btnToggle.style.background = '#ff9800';
        } else {
            active = false;
            btnToggle.textContent = 'START';
            btnToggle.style.background = '#4CAF50';
        }
    });

    btnToggle.addEventListener('click', function() {
        if (holdMode) return;
        active = !active;
        if (active) {
            startClicking();
            btnToggle.textContent = 'STOP';
            btnToggle.style.background = '#f44336';
        } else {
            stopClicking();
            btnToggle.textContent = 'START';
            btnToggle.style.background = '#4CAF50';
        }
    });

    btnClose.addEventListener('click', function() {
        stopClicking();
        panel.remove();
        reticle.remove();
        window.__autoClickerLoaded = false;
    });
})();
