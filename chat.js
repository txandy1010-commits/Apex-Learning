document.title = "Google";

(function () {
  // ==========================================
  // 1. Dynamic Bad Word Filter State
  // ==========================================
  let bannedWordsList = [];

  async function fetchBannedWordsFromNeon() {
    try {
      const res = await fetch('/api/get-bad-words');
      const data = await res.json();
      if (data.bannedWords && Array.isArray(data.bannedWords)) {
        bannedWordsList = data.bannedWords.map(w => w.toLowerCase());
      }
    } catch (err) {
      console.error('Failed to load banned words from Neon:', err);
    }
  }

  function containsBadWords(text) {
    if (!bannedWordsList.length) return false;

    const normalized = text.toLowerCase()
      .replace(/[@@]/g, 'a')
      .replace(/[$$]/g, 's')
      .replace(/[1!]/g, 'i')
      .replace(/0/g, 'o')
      .replace(/3/g, 'e');

    return bannedWordsList.some(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(normalized) || normalized.includes(word);
    });
  }

  // ==========================================
  // 2. Inject Styles
  // ==========================================
  const style = document.createElement('style');
  style.innerHTML = `
    #chat-widget-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background-color: #5865F2;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 9999;
      font-size: 24px;
      transition: transform 0.2s ease;
    }
    #chat-widget-toggle:hover {
      transform: scale(1.08);
    }
    #chat-widget-toggle.has-unread::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      background-color: #f23f43;
      border-radius: 50%;
      border: 2px solid #313338;
    }
    #chat-widget-box {
      position: fixed;
      bottom: 85px;
      right: 20px;
      width: 380px;
      height: 500px;
      background-color: #313338;
      color: #dbdee1;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    #chat-widget-box.fullscreen {
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }
    .chat-header {
      background-color: #2b2d31;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e1f22;
    }
    .chat-header h3 {
      margin: 0;
      font-size: 15px;
      color: #f2f3f5;
    }
    .chat-header button {
      background: none;
      border: none;
      color: #b5bac1;
      cursor: pointer;
      font-size: 14px;
      margin-left: 6px;
    }
    .chat-header button:hover {
      color: #fff;
    }
    .chat-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }
    .chat-sidebar {
      width: 120px;
      background-color: #2b2d31;
      border-right: 1px solid #1e1f22;
      padding: 8px;
      overflow-y: auto;
    }
    .sidebar-item {
      padding: 6px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      color: #949ba4;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sidebar-item:hover, .sidebar-item.active {
      background-color: #35373c;
      color: #f2f3f5;
    }
    .sidebar-item.has-unread {
      color: #ffffff !important;
      font-weight: bold;
    }
    .chat-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: #313338;
    }
    .chat-messages {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-msg {
      font-size: 13px;
      line-height: 1.4;
      position: relative;
      padding-right: 40px;
      transition: transform 0.1s ease-out;
      touch-action: pan-y;
    }
    .chat-msg .author {
      font-weight: bold;
      color: #5865F2;
      margin-right: 6px;
    }
    .chat-msg .reply-preview {
      font-size: 11px;
      color: #b5bac1;
      border-left: 2px solid #4e5058;
      padding-left: 6px;
      margin-bottom: 2px;
    }
    .chat-msg-actions {
      position: absolute;
      right: 0;
      top: 0;
      display: none;
      gap: 4px;
    }
    .chat-msg:hover .chat-msg-actions {
      display: flex;
    }
    .action-btn {
      background: none;
      border: none;
      color: #b5bac1;
      cursor: pointer;
      font-size: 12px;
      padding: 0 2px;
    }
    .action-btn:hover {
      color: #f2f3f5;
    }
    .action-btn.delete-btn:hover {
      color: #f23f43;
    }
    .reply-banner {
      background-color: #2b2d31;
      padding: 4px 12px;
      font-size: 11px;
      color: #b5bac1;
      display: none;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #1e1f22;
    }
    .reply-banner span {
      cursor: pointer;
      color: #f23f43;
    }
    .chat-input-area {
      padding: 10px;
      background-color: #383a40;
      display: flex;
      gap: 6px;
    }
    .chat-input-area input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f2f3f5;
      outline: none;
      font-size: 13px;
    }
    .chat-input-area button {
      background-color: #5865F2;
      border: none;
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // ==========================================
  // 3. Inject HTML
  // ==========================================
  const widgetHTML = `
    <div id="chat-widget-toggle">💬</div>
    <div id="chat-widget-box">
      <div class="chat-header">
        <h3 id="chat-title"># Global Chat</h3>
        <div>
          <button id="chat-fullscreen-btn">⛶</button>
          <button id="chat-close-btn">✕</button>
        </div>
      </div>
      <div class="chat-body">
        <div class="chat-sidebar" id="chat-sidebar">
          <div class="sidebar-item active" data-target="global"># Global Chat</div>
        </div>
        <div class="chat-content">
          <div class="chat-messages" id="chat-messages"></div>
          <div class="reply-banner" id="reply-banner">
            <div id="reply-text">Replying to message...</div>
            <span id="cancel-reply">✕</span>
          </div>
          <div class="chat-input-area">
            <input type="text" id="chat-input" placeholder="Type a message..." />
            <button id="chat-send">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = widgetHTML;
  document.body.appendChild(wrapper);

  // ==========================================
  // 4. UI References & State Variables
  // ==========================================
  const toggleBtn = document.getElementById('chat-widget-toggle');
  const box = document.getElementById('chat-widget-box');
  const closeBtn = document.getElementById('chat-close-btn');
  const fullscreenBtn = document.getElementById('chat-fullscreen-btn');
  const sendBtn = document.getElementById('chat-send');
  const inputEl = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');
  const sidebarEl = document.getElementById('chat-sidebar');
  const titleEl = document.getElementById('chat-title');
  const replyBanner = document.getElementById('reply-banner');
  const replyText = document.getElementById('reply-text');
  const cancelReplyBtn = document.getElementById('cancel-reply');

  let activeRecipient = 'global';
  let activeReply = null;

  function getLoggedUser() {
    return localStorage.getItem('loggedUser') || localStorage.getItem('username') || 'Anonymous';
  }

  function getLoggedRole() {
    return (localStorage.getItem('role') || '').toLowerCase();
  }

  if (getLoggedUser().toLowerCase() === 'admin' || getLoggedRole() === 'owner') {
    box.style.display = 'flex';
  }

  // ==========================================
  // 5. LocalStorage Helpers
  // ==========================================
  function getStorageKey(target) {
    return `chat_history_${target.toLowerCase()}`;
  }

  function getHistory(target) {
    return JSON.parse(localStorage.getItem(getStorageKey(target)) || '[]');
  }

  function saveMessage(target, msgObj) {
    const history = getHistory(target);
    if (!history.some(m => m.id === msgObj.id)) {
      history.push(msgObj);
      localStorage.setItem(getStorageKey(target), JSON.stringify(history));
    }
  }

  function removeMessageFromStorage(target, msgId) {
    const history = getHistory(target).filter(m => m.id !== msgId);
    localStorage.setItem(getStorageKey(target), JSON.stringify(history));
  }

  // ==========================================
  // 6. Sidebar & UI Logic
  // ==========================================
  function addUserToSidebar(username) {
    if (!username || username === 'Anonymous' || username.toLowerCase() === getLoggedUser().toLowerCase()) return;
    if (document.querySelector(`.sidebar-item[data-target="${username}"]`)) return;

    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.target = username;
    item.textContent = '@ ' + username;
    item.addEventListener('click', () => switchChannel(username, item));
    sidebarEl.appendChild(item);
  }

  function switchChannel(target, element) {
    activeRecipient = target;
    titleEl.textContent = target === 'global' ? '# Global Chat' : `@ ${target}`;

    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    element.classList.remove('has-unread');

    clearReplyTarget();
    renderChatHistory(target);
  }

  function renderChatHistory(target) {
    messagesEl.innerHTML = '';
    const history = getHistory(target);
    history.forEach(msg => appendMessageUI(msg));
  }

  function triggerReplyMode(msgData) {
    activeReply = { id: msgData.id, sender: msgData.sender, message: msgData.message };
    replyText.textContent = `Replying to ${msgData.sender}...`;
    replyBanner.style.display = 'flex';
    inputEl.focus();
  }

  function appendMessageUI(msgData) {
    if (msgData.id && document.querySelector(`.chat-msg[data-id="${msgData.id}"]`)) {
      return;
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    if (msgData.id) msgDiv.dataset.id = msgData.id;

    let replyMarkup = '';
    if (msgData.replyTo) {
      replyMarkup = `<div class="reply-preview">Replying to ${escapeHTML(msgData.replyTo.sender)}: "${escapeHTML(msgData.replyTo.message)}"</div>`;
    }

    const currentUser = getLoggedUser();
    const currentRole = getLoggedRole();
    const isOwner = currentRole === 'owner';
    const isSelf = msgData.sender.toLowerCase() === currentUser.toLowerCase();
    const canDelete = isOwner || isSelf;

    msgDiv.innerHTML = `
      ${replyMarkup}
      <div>
        <span class="author">${escapeHTML(msgData.sender)}:</span>
        <span>${escapeHTML(msgData.message)}</span>
      </div>
      <div class="chat-msg-actions">
        <button class="action-btn reply-btn" title="Reply">↩</button>
        ${canDelete ? '<button class="action-btn delete-btn" title="Delete">🗑</button>' : ''}
      </div>
    `;

    msgDiv.querySelector('.reply-btn').addEventListener('click', () => {
      triggerReplyMode(msgData);
    });

    if (canDelete) {
      msgDiv.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm('Delete this message?')) {
          msgDiv.remove();
          removeMessageFromStorage(activeRecipient, msgData.id);

          try {
            await fetch('/api/send-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', id: msgData.id, sender: currentUser, recipient: activeRecipient })
            });
          } catch (err) {
            console.error('Failed to dispatch delete request:', err);
          }
        }
      });
    }

    let touchStartX = 0;
    let touchCurrentX = 0;

    msgDiv.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    msgDiv.addEventListener('touchmove', (e) => {
      touchCurrentX = e.touches[0].clientX;
      const diffX = touchCurrentX - touchStartX;
      if (diffX > 0 && diffX < 80) {
        msgDiv.style.transform = `translateX(${diffX}px)`;
      }
    }, { passive: true });

    msgDiv.addEventListener('touchend', () => {
      const diffX = touchCurrentX - touchStartX;
      if (diffX > 50) {
        triggerReplyMode(msgData);
      }
      msgDiv.style.transform = 'translateX(0px)';
      touchStartX = 0;
      touchCurrentX = 0;
    });

    messagesEl.appendChild(msgDiv);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function clearReplyTarget() {
    activeReply = null;
    replyBanner.style.display = 'none';
  }

  cancelReplyBtn.addEventListener('click', clearReplyTarget);

  // ==========================================
  // 7. Pusher Setup
  // ==========================================
  if (typeof Pusher !== 'undefined') {
    const pusher = new Pusher('c33c47677ef3d8d8a413', { cluster: 'us2' });

    const globalChan = pusher.subscribe('global-chat');
    globalChan.bind('message', function(data) {
      if (data.sender.toLowerCase() === getLoggedUser().toLowerCase()) return;

      saveMessage('global', data);
      addUserToSidebar(data.sender);

      if (activeRecipient === 'global') {
        appendMessageUI(data);
      } else {
        if (box.style.display !== 'flex') toggleBtn.classList.add('has-unread');
      }
    });

    globalChan.bind('delete-message', function(data) {
      removeMessageFromStorage('global', data.id);
      const existing = document.querySelector(`.chat-msg[data-id="${data.id}"]`);
      if (existing) existing.remove();
    });

    const currentUser = getLoggedUser();
    if (currentUser !== 'Anonymous') {
      const userChan = pusher.subscribe(`user-${currentUser.toLowerCase()}`);

      userChan.bind('direct-message', function(data) {
        if (data.sender.toLowerCase() === getLoggedUser().toLowerCase()) return;

        saveMessage(data.sender, data);
        addUserToSidebar(data.sender);

        const isChatOpen = box.style.display === 'flex';
        const isTargetActive = activeRecipient.toLowerCase() === data.sender.toLowerCase();

        if (isChatOpen && isTargetActive) {
          appendMessageUI(data);
        } else {
          if (!isChatOpen) toggleBtn.classList.add('has-unread');
          if (!isTargetActive) {
            const userItem = document.querySelector(`.sidebar-item[data-target="${data.sender}"]`);
            if (userItem) userItem.classList.add('has-unread');
          }
        }
      });

      userChan.bind('delete-message', function(data) {
        removeMessageFromStorage(activeRecipient, data.id);
        const existing = document.querySelector(`.chat-msg[data-id="${data.id}"]`);
        if (existing) existing.remove();
      });
    }
  }

  // ==========================================
  // 8. Network Requests & Message Sending
  // ==========================================
  async function fetchUsersFromNeon() {
    try {
      const res = await fetch('/api/get-users');
      const data = await res.json();
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach(u => addUserToSidebar(u));
      }
    } catch (err) {
      console.error('Failed to load registered Neon users:', err);
    }
  }

  async function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;

    if (containsBadWords(text)) {
      alert('Please keep the chat appropriate. Inappropriate language is not allowed.');
      inputEl.value = '';
      return;
    }

    const msgId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
    const sender = getLoggedUser();

    const payload = {
      id: msgId,
      action: activeRecipient === 'global' ? 'global' : 'pm',
      sender: sender,
      recipient: activeRecipient,
      message: text,
      replyTo: activeReply
    };

    appendMessageUI(payload);
    saveMessage(activeRecipient, payload);

    inputEl.value = '';
    clearReplyTarget();

    try {
      await fetch('/api/send-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  // ==========================================
  // 9. Event Listeners & Init
  // ==========================================
  toggleBtn.addEventListener('click', () => {
    const isOpening = box.style.display !== 'flex';
    box.style.display = isOpening ? 'flex' : 'none';
    if (isOpening) toggleBtn.classList.remove('has-unread');
  });

  closeBtn.addEventListener('click', () => { box.style.display = 'none'; });
  fullscreenBtn.addEventListener('click', () => { box.classList.toggle('fullscreen'); });

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keypress', e => { if (e.key === 'Enter') handleSend(); });

  document.querySelector('.sidebar-item[data-target="global"]').addEventListener('click', function() {
    switchChannel('global', this);
  });

  function escapeHTML(str) {
    return (str || '').replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // Initialization
  renderChatHistory('global');
  fetchUsersFromNeon();
  fetchBannedWordsFromNeon();
})();

// Append to chat.js
(function() {
    // 1. Check if user is on index.html or root "/"
    const path = window.location.pathname;
    const isIndex = path === '/' || path.endsWith('/index.html') || path.endsWith('/index');
    if (isIndex) return; // Exit immediately if on index.html

    // 2. Prevent duplicate instances
    if (window.__autoClickerLoaded) return;
    window.__autoClickerLoaded = true;

    let active = false,
        intervalId = null,
        clickInterval = 50,
        targetX = window.innerWidth / 2,
        targetY = window.innerHeight / 2,
        holdMode = false,
        isHolding = false,
        followCursor = false;

    // Create panel (Positioned TOP-LEFT)
    const panel = document.createElement('div');
    panel.id = 'ac-ui-panel';
    panel.style.cssText = 'position:fixed;top:20px;left:20px;width:210px;background:#1e1e2f;color:#fff;padding:12px;border-radius:10px;box-shadow:0 8px 16px rgba(0,0,0,0.4);z-index:999999;font-family:sans-serif;font-size:13px;user-select:none;';
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

    // Wait until DOM is ready to append elements
    function init() {
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
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
