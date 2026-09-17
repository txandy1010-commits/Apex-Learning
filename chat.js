(function () {
  // 1. Dynamic Bad Word Filter State
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

    // Normalize text: lowercase and strip common leetspeak/punctuation tricks
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

  // 2. Inject Styles
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

  // 3. Inject HTML
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

  // 4. UI References & State Variables
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

  // 5. LocalStorage Helpers
  function getStorageKey(target) {
    return `chat_history_${target.toLowerCase()}`;
  }

  function getHistory(target) {
    return JSON.parse(localStorage.getItem(getStorageKey(target)) || '[]');
  }

  function saveMessage(target, msgObj) {
    const history = getHistory(target);
    history.push(msgObj);
    localStorage.setItem(getStorageKey(target), JSON.stringify(history));
  }

  function removeMessageFromStorage(target, msgId) {
    const history = getHistory(target).filter(m => m.id !== msgId);
    localStorage.setItem(getStorageKey(target), JSON.stringify(history));
  }

  // 6. Sidebar & UI Logic
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
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg';
    msgDiv.dataset.id = msgData.id;

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

  // 7. Pusher Subscriptions
  const pusher = new Pusher('YOUR_PUSHER_KEY', { cluster: 'YOUR_PUSHER_CLUSTER' });

  const globalChan = pusher.subscribe('global-chat');
  globalChan.bind('message', function(data) {
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

  // 8. Network Requests & Message Sending
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

    // Bad Word Validation Check via Neon DB
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

  // 9. Event Listeners
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
