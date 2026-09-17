// 1. Inject Visual Styles (CSS)
document.title = "google.com";

(function injectStyles() {
  const style = document.createElement('style');
  style.innerHTML = `
    #chat-widget-toggle {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      background-color: #5865F2; color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 9999;
      font-size: 24px; transition: transform 0.2s ease;
    }
    #chat-widget-toggle:hover { transform: scale(1.08); }
    #chat-widget-box {
      position: fixed; bottom: 85px; right: 20px; width: 400px; height: 500px;
      background-color: #313338; color: #dbdee1; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4); display: none;
      flex-direction: column; overflow: hidden; z-index: 9999;
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .chat-header {
      background-color: #2b2d31; padding: 12px 16px; font-weight: bold;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #1e1f22;
    }
    .chat-close { cursor: pointer; color: #b5bac1; font-size: 16px; }
    .chat-close:hover { color: #fff; }
    .chat-body { display: flex; flex: 1; overflow: hidden; }
    .chat-sidebar {
      width: 120px; background-color: #2b2d31; border-right: 1px solid #1e1f22;
      padding: 8px; overflow-y: auto;
    }
    .sidebar-item {
      padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;
      color: #949ba4; margin-bottom: 4px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .sidebar-item:hover, .sidebar-item.active { background-color: #35373c; color: #f2f3f5; }
    .chat-content { flex: 1; display: flex; flex-direction: column; background-color: #313338; }
    #chatContainer { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .chat-message { font-size: 13px; line-height: 1.4; }
    .chat-message .author { font-weight: bold; color: #5865F2; margin-right: 4px; }
    .chat-message .timestamp { font-size: 11px; color: #949ba4; margin-left: 4px; font-weight: normal; }
    .chat-message.pm { border-left: 2px solid #f1c40f; padding-left: 6px; }
    .chat-input-area { padding: 10px; background-color: #383a40; display: flex; gap: 6px; }
    .chat-input-area input { flex: 1; background: transparent; border: none; color: #f2f3f5; outline: none; }
    .chat-input-area button { background-color: #5865F2; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
  `;
  document.head.appendChild(style);
})();

// 2. Inject Elements & Logic
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Pusher === 'undefined') {
    console.error('Pusher JS library is missing. Make sure to load Pusher before chat.js!');
    return;
  }

  // Request Notification Permissions
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
  }

  // Inject HTML Markup
  if (!document.getElementById('chat-widget-toggle')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="chat-widget-toggle">💬</div>
      <div id="chat-widget-box">
        <div class="chat-header">
          <span id="chat-header-title"># Global Chat</span>
          <span class="chat-close" id="chat-close-btn">✕</span>
        </div>
        <div class="chat-body">
          <div class="chat-sidebar" id="chat-sidebar">
            <div class="sidebar-item active" data-target="global"># Global</div>
          </div>
          <div class="chat-content">
            <div id="chatContainer"></div>
            <div class="chat-input-area">
              <input type="text" id="chat-input-field" placeholder="Type a message..." />
              <button id="chat-send-btn">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    // Elements
    const toggleBtn = document.getElementById('chat-widget-toggle');
    const box = document.getElementById('chat-widget-box');
    const closeBtn = document.getElementById('chat-close-btn');
    const sidebarEl = document.getElementById('chat-sidebar');
    const titleEl = document.getElementById('chat-header-title');
    const inputEl = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatContainer = document.getElementById('chatContainer');

    // App Credentials & State
    const PUSHER_KEY = 'c33c47677ef3d8d8a413';
    const PUSHER_CLUSTER = 'us2';
    const currentUser = localStorage.getItem('loggedUser') || 'Anonymous';
    let activeRecipient = 'global';

    toggleBtn.addEventListener('click', () => { box.style.display = box.style.display === 'flex' ? 'none' : 'flex'; });
    closeBtn.addEventListener('click', () => { box.style.display = 'none'; });

    // Initialize Pusher Client
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    // 1. Subscribe to Global Channel
    const globalChannel = pusher.subscribe('global-chat');
    globalChannel.bind('message', function(data) {
      saveMessage('global', data);
      addUserToSidebar(data.sender);
      if (activeRecipient === 'global') {
        renderIncomingMessage(data.sender, data.message, data.created_at, false);
      }
    });

    // 2. Subscribe to Private DM Channel
    if (currentUser !== 'Anonymous') {
      const privateChannel = pusher.subscribe(`user-${currentUser.toLowerCase()}`);
      privateChannel.bind('direct-message', function(data) {
        saveMessage(data.sender, data);
        addUserToSidebar(data.sender);

        if (activeRecipient.toLowerCase() === data.sender.toLowerCase()) {
          renderIncomingMessage(data.sender, data.message, data.created_at, true);
        } else {
          triggerDMNotification(data.sender, data.message);
        }
      });
    }

    // Input Actions (NO LOCAL RENDER HERE TO PREVENT DOUBLE MESSAGES)
    const handleSend = async () => {
      const text = inputEl.value.trim();
      if (!text) return;

      const isPrivate = activeRecipient !== 'global';
      const msgData = {
        sender: currentUser,
        recipient: activeRecipient,
        message: text,
        created_at: new Date().toISOString()
      };

      // If sending a DM, render and save it locally immediately
      if (isPrivate) {
        saveMessage(activeRecipient, msgData);
        renderIncomingMessage(currentUser, text, msgData.created_at, true);
      }

      inputEl.value = '';

      // Send to serverless API
      try {
        await fetch('/api/send-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isPrivate ? 'pm' : 'live',
            sender: currentUser,
            recipient: isPrivate ? activeRecipient : null,
            message: text
          })
        });
      } catch (error) {
        console.error('Network error sending message:', error);
      }
    };

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

    // Local Storage Helpers
    function saveMessage(chatKey, msgObj) {
      const key = `chat_history_${chatKey.toLowerCase()}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(msgObj);
      localStorage.setItem(key, JSON.stringify(existing));
    }

    function loadChatHistory(chatKey) {
      chatContainer.innerHTML = '';
      const key = `chat_history_${chatKey.toLowerCase()}`;
      const history = JSON.parse(localStorage.getItem(key) || '[]');
      const now = Date.now();

      history.forEach(msg => {
        const msgTime = new Date(msg.created_at).getTime();
        // Skip global messages older than 1 hour (3600000 ms)
        if (chatKey === 'global' && now - msgTime > 3600000) return;

        const isPrivate = chatKey !== 'global';
        renderIncomingMessage(msg.sender, msg.message, msg.created_at, isPrivate);
      });
    }

    // Sidebar Logic
    function addUserToSidebar(username) {
      if (!username || username === currentUser || username === 'Anonymous' || username === 'global') return;
      
      // Save user list permanently
      let savedUsers = JSON.parse(localStorage.getItem('chat_sidebar_users') || '[]');
      if (!savedUsers.includes(username)) {
        savedUsers.push(username);
        localStorage.setItem('chat_sidebar_users', JSON.stringify(savedUsers));
      }

      if (document.querySelector(`.sidebar-item[data-target="${username}"]`)) return;

      const item = document.createElement('div');
      item.className = 'sidebar-item';
      item.dataset.target = username;
      item.textContent = `@ ${username}`;
      
      item.addEventListener('click', () => switchChannel(username, item));
      sidebarEl.appendChild(item);
    }

    function switchChannel(target, element) {
      activeRecipient = target;
      titleEl.textContent = target === 'global' ? '# Global Chat' : `@ ${target}`;
      
      document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      
      loadChatHistory(target);
    }

    document.querySelector('.sidebar-item[data-target="global"]').addEventListener('click', function() {
      switchChannel('global', this);
    });

    // Load Saved Sidebar Users on startup
    const savedUsers = JSON.parse(localStorage.getItem('chat_sidebar_users') || '[]');
    savedUsers.forEach(u => addUserToSidebar(u));

    // Message Rendering & Auto-Delete Timer
    function renderIncomingMessage(sender, message, timestamp, isPrivate) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-message ${isPrivate ? 'pm' : ''}`;
      
      const dateObj = timestamp ? new Date(timestamp) : new Date();
      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      msgDiv.innerHTML = `
        <span class="author">${escapeHtml(sender)}</span>
        <span class="timestamp">${timeFormatted}</span>
        <div>${escapeHtml(message)}</div>
      `;
      
      chatContainer.appendChild(msgDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // Auto-delete global messages after 1 hour from creation
      if (!isPrivate) {
        const remainingTime = 3600000 - (Date.now() - dateObj.getTime());
        if (remainingTime > 0) {
          setTimeout(() => { if (chatContainer.contains(msgDiv)) msgDiv.remove(); }, remainingTime);
        } else {
          msgDiv.remove();
        }
      }
    }

    function triggerDMNotification(sender, text) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`New DM from ${sender}`, {
          body: text,
          icon: '/favicon.ico'
        });
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Initial load
    loadChatHistory('global');
  }
});
