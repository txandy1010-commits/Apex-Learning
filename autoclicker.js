(function () {
    if (window.__autoclicker_loaded) return;
    window.__autoclicker_loaded = true;

    let active = false;
    let intervalId = null;
    let cps = 20;
    let mouseX = 0, mouseY = 0;

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Create HUD Overlay
    const container = document.createElement('div');
    container.id = 'autoclicker-ui';
    container.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 999999;
        background: rgba(15, 15, 15, 0.9);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: sans-serif;
        font-size: 13px;
        border: 2px solid #1e90ff;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        user-select: none;
    `;

    container.innerHTML = `
        <span style="font-weight: bold; color: #1e90ff;">Auto Clicker</span>
        <label>CPS: <input type="number" id="ac-cps" value="20" min="1" max="100" style="width: 45px; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; padding: 2px 4px; text-align: center;"></label>
        <button id="ac-toggle" style="background: #1e90ff; color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">OFF [Key: E]</button>
    `;

    document.body.appendChild(container);

    const toggleBtn = container.querySelector('#ac-toggle');
    const cpsInput = container.querySelector('#ac-cps');

    cpsInput.addEventListener('change', (e) => {
        cps = Math.max(1, Math.min(100, parseInt(e.target.value) || 20));
        if (active) {
            stopClicking();
            startClicking();
        }
    });

    function clickTarget() {
        const target = document.elementFromPoint(mouseX, mouseY);
        if (target && target !== container && !container.contains(target)) {
            ['mousedown', 'mouseup', 'click'].forEach(eventType => {
                target.dispatchEvent(new MouseEvent(eventType, {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: mouseX,
                    clientY: mouseY
                }));
            });
        }
    }

    function startClicking() {
        active = true;
        toggleBtn.textContent = "ON [Key: E]";
        toggleBtn.style.background = "#22c55e";
        intervalId = setInterval(clickTarget, 1000 / cps);
    }

    function stopClicking() {
        active = false;
        toggleBtn.textContent = "OFF [Key: E]";
        toggleBtn.style.background = "#1e90ff";
        if (intervalId) clearInterval(intervalId);
    }

    function toggle() {
        if (active) stopClicking();
        else startClicking();
    }

    toggleBtn.addEventListener('click', toggle);

    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'e' && document.activeElement.tagName !== 'INPUT') {
            toggle();
        }
    });
})();
