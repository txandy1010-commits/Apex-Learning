// 1. Inject Visual Styles (CSS)
(function injectStyles() {
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
    #chat-widget-toggle:hover { transform: scale(1.08); }
    #chat-widget-box {
      position: fixed;
      bottom: 85px;
      right: 20px;
      width: 350px;
      height: 450px;
      background-color: #313338;
      color: #dbdee1;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 9999;
      font-family: Arial, sans-serif;
    }
    .chat-header {
      background-color: #2b2d31;
      padding: 12px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1e1f22;
    }
    .chat-close { cursor: pointer; color: #b5bac1; }
    #chatContainer {
      flex: 1;
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .chat-message { font-size: 13px; line-height: 1.4; }
    .chat-message.sent { text-align: right; color: #9ec5fe; }
    .chat-message.pm { border-left: 2px solid #f1c40f; padding-left: 4px; }
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
    }
    .chat-input-area button {
      background-color: #5865F2;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
})();

// 2. Inject Visual Elements (HTML)
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('chat-widget-toggle')) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="chat-widget-toggle">💬</div>
      <div id="chat-widget-box">
        <div class="chat-header">
          <span id="chat-header-title">Global Chat</span>
          <span class="chat-close" id="chat-close-btn">✕</span>
        </div>
        <div id="chatContainer"></div>
        <div class="chat-input-area">
          <input type="text" id="chat-input-field" placeholder="Type a message..." />
          <button id="chat-send-btn">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    // Setup toggle behavior
    const toggleBtn = document.getElementById('chat-widget-toggle');
    const box = document.getElementById('chat-widget-box');
    const closeBtn = document.getElementById('chat-close-btn');

    toggleBtn.addEventListener('click', () => {
      box.style.display = box.style.display === 'flex' ? 'none' : 'flex';
    });
    closeBtn.addEventListener('click', () => {
      box.style.display = 'none';
    });

    // Handle Input Sends
    const inputEl = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');

    const handleSend = () => {
      const text = inputEl.value;
      if (text) {
        sendMessage(text, activeRecipient);
        inputEl.value = '';
      }
    };

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
});

// 3. Pusher Connection & Logic
if (typeof Pusher === 'undefined') {
  console.error('Pusher JS library is missing. Make sure to load Pusher before chat.js!');
} else {
  const PUSHER_KEY = 'c33c47677ef3d8d8a413';
  const PUSHER_CLUSTER = 'us2';

  const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
  const currentUser = localStorage.getItem('loggedUser') || 'Anonymous';
  let activeRecipient = 'global';

  // Global Channel
  const globalChannel = pusher.subscribe('global-chat');
  globalChannel.bind('message', function(data) {
    renderIncomingMessage(data.sender, data.message, data.created_at, false);
  });

  // Private Channel
  if (currentUser !== 'Anonymous') {
    const privateChannel = pusher.subscribe(`user-${currentUser.toLowerCase()}`);
    privateChannel.bind('direct-message', function(data) {
      if (activeRecipient.toLowerCase() === data.sender.toLowerCase()) {
        renderIncomingMessage(data.sender, data.message, data.created_at, true);
      }
    });
  }

  // Send function
  async function sendMessage(messageText, recipient = 'global') {
    if (!messageText.trim()) return;

    const isLive = recipient === 'global';
    const payload = {
      action: isLive ? 'live' : 'pm',
      sender: currentUser,
      recipient: isLive ? null : recipient,
      message: messageText
    };

    try {
      await fetch('/api/send-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Network error sending message:', error);
    }
  }

  function renderIncomingMessage(sender, message, timestamp, isPrivate) {
    const chatContainer = document.getElementById('chatContainer');
    if (!chatContainer) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender === currentUser ? 'sent' : 'received'} ${isPrivate ? 'pm' : ''}`;
    
    const timeFormatted = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    msgDiv.innerHTML = `<strong>${sender}</strong>: ${escapeHtml(message)} <span style="font-size:10px;opacity:0.6">${timeFormatted}</span>`;
    
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.sendMessage = sendMessage;
}
