// 1. Set Tab Title
document.title = "google.com";

// 2. Inject CSS Styles
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
      position: fixed; bottom: 85px; right: 20px; width: 420px; height: 520px;
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
      width: 130px; background-color: #2b2d31; border-right: 1px solid #1e1f22;
      padding: 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px;
    }
    .user-select-dropdown {
      width: 100%; background: #383a40; color: #f2f3f5; border: 1px solid #1e1f22;
      border-radius: 4px; padding: 4px; font-size: 11px; outline: none; cursor: pointer;
    }
    .sidebar-item {
      padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 13px;
      color: #949ba4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sidebar-item:hover, .sidebar-item.active { background-color: #35373c; color: #f2f3f5; }
    .chat-content { flex: 1; display: flex; flex-direction: column; background-color: #313338; }
    #chatContainer { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
    
    .chat-message { 
      position: relative; 
      font-size: 13px; 
      line-height: 1.4; 
      touch-action: pan-y; 
      transition: transform 0.1s ease-out;
      user-select: none;
      cursor: grab;
    }
    .chat-message:active { cursor: grabbing; }
    .chat-message .author { font-weight: bold; color: #5865F2; margin-right: 4px; }
    .chat-message .timestamp { font-size: 11px; color: #949ba4; margin-left: 4px; }
    .chat-message.pm { border-left: 2px solid #f1c40f; padding-left: 6px; }
    
    .reply-prefix {
      font-size: 11px;
      color: #949ba4;
      font-style: italic;
      margin-right: 6px;
      display: inline-block;
    }

    #reply-banner {
      display: none; background: #2b2d31; padding: 4px 8px; font-size: 11px;
      color: #b5bac1; border-top: 1px solid #1e1f22; justify-content: space-between; align-items: center;
    }
    #cancel-reply { cursor: pointer; color: #ed4245; font-weight: bold; }

    .chat-input-area { padding: 10px; background-color: #383a40; display: flex; gap: 6px; }
    .chat-input-area input { flex: 1; background: transparent; border: none; color: #f2f3f5; outline: none; }
    .chat-input-area button { background-color: #5865F2; border: none; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }

    /* Delete Confirmation Modal */
    #delete-modal-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.6); display: none; align-items: center;
      justify-content: center; z-index: 10000;
    }
    .delete-modal {
      background: #313338; color: #f2f3f5; padding: 20px; border-radius: 8px;
      width: 280px; text-align: center; box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    }
    .delete-modal p { margin: 0 0 16px 0; font-size: 14px; }
    .delete-modal-buttons { display: flex; gap: 10px; justify-content: center; }
    .delete-modal-buttons button {
      padding: 6px 16px; border: none; border-radius: 4px; cursor: pointer;
      font-weight: bold; font-size: 13px;
    }
    #confirm-delete-btn { background: #da373c; color: white; }
    #cancel-delete-btn { background: #4e5058; color: white; }
  `;
  document.head.appendChild(style);
})();

// 3. Main Chat Script
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Pusher === 'undefined') {
    console.error('Pusher library missing!');
    return;
  }

  // Bad words array
  const BAD_WORDS_LIST = [
    'fuck', 'shit', 'bitch', 'ass', 'asshole', 'bastard', 'crap', 'dammit', 
    'damn', 'dick', 'pussy', 'slut', 'whore', 'cock', 'cunt', 'nigger', 'faggot'
  ];

  function filterProfanity(text) {
    if (!text) return '';
    const pattern = new RegExp('\\b(' + BAD_WORDS_LIST.join('|') + ')\\b', 'gi');
    return text.replace(pattern, (match) => match[0] + '*'.repeat(match.length - 1));
  }

  function getFirstThreeWords(text) {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    return words.slice(0, 3).join(' ');
  }

  // Inject UI Markup
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
            <select id="user-select-dropdown" class="user-select-dropdown">
              <option value="" disabled selected>-- DM a User --</option>
            </select>
            <div class="sidebar-item active" data-target="global"># Global</div>
          </div>
          <div class="chat-content">
            <div id="chatContainer"></div>
            <div id="reply-banner">
              <span id="reply-banner-text">Replying...</span>
              <span id="cancel-reply">✕</span>
            </div>
            <div class="chat-input-area">
              <input type="text" id="chat-input-field" placeholder="Type a message..." />
              <button id="chat-send-btn">Send</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    // Inject Delete Confirmation Modal
    const modalWrapper = document.createElement('div');
    modalWrapper.id = 'delete-modal-overlay';
    modalWrapper.innerHTML = `
      <div class="delete-modal">
        <p>Are you sure you want to delete this message?</p>
        <div class="delete-modal-buttons">
          <button id="confirm-delete-btn">Yes</button>
          <button id="cancel-delete-btn">No</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper);

    // References
    const toggleBtn = document.getElementById('chat-widget-toggle');
    const box = document.getElementById('chat-widget-box');
    const closeBtn = document.getElementById('chat-close-btn');
    const sidebarEl = document.getElementById('chat-sidebar');
    const dropdownEl = document.getElementById('user-select-dropdown');
    const titleEl = document.getElementById('chat-header-title');
    const inputEl = document.getElementById('chat-input-field');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatContainer = document.getElementById('chatContainer');
    const replyBanner = document.getElementById('reply-banner');
    const replyBannerText = document.getElementById('reply-banner-text');
    const cancelReplyBtn = document.getElementById('cancel-reply');

    const modalOverlay = document.getElementById('delete-modal-overlay');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    let pendingDeleteId = null;

    // App State
    const currentUser = localStorage.getItem('loggedUser') || localStorage.getItem('username') || localStorage.getItem('user') || 'Anonymous';
    const PUSHER_KEY = 'c33c47677ef3d8d8a413';
    const PUSHER_CLUSTER = 'us2';
    let activeRecipient = 'global';
    let currentReplyTarget = null;

    toggleBtn.addEventListener('click', () => { box.style.display = box.style.display === 'flex' ? 'none' : 'flex'; });
    closeBtn.addEventListener('click', () => { box.style.display = 'none'; });

    // Modal Events
    function promptDeleteConfirmation(msgId) {
      pendingDeleteId = msgId;
      modalOverlay.style.display = 'flex';
    }

    confirmDeleteBtn.addEventListener('click', () => {
      if (pendingDeleteId) {
        deleteMessage(pendingDeleteId);
        pendingDeleteId = null;
      }
      modalOverlay.style.display = 'none';
    });

    cancelDeleteBtn.addEventListener('click', () => {
      pendingDeleteId = null;
      modalOverlay.style.display = 'none';
    });

    // Cross-Tab Presence Sync
    const presenceChannel = new BroadcastChannel('chat_presence');
    presenceChannel.postMessage({ type: 'ANNOUNCE_USER', user: currentUser });
    presenceChannel.onmessage = (e) => {
      if (e.data && e.data.type === 'ANNOUNCE_USER') {
        addUserToSidebarAndDropdown(e.data.user);
      }
    };

    // Pusher Setup
    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });

    const globalChannel = pusher.subscribe('global-chat');
    globalChannel.bind('message', function(data) {
      saveMessage('global', data);
      addUserToSidebarAndDropdown(data.sender);
      if (activeRecipient === 'global') {
        renderIncomingMessage(data);
      }
    });

    globalChannel.bind('delete-message', function(data) {
      removeMessageFromUIAndStorage('global', data.id);
    });

    if (currentUser !== 'Anonymous') {
      const privateChannel = pusher.subscribe(`user-${currentUser.toLowerCase()}`);
      privateChannel.bind('direct-message', function(data) {
        saveMessage(data.sender, data);
        addUserToSidebarAndDropdown(data.sender);

        if (activeRecipient.toLowerCase() === data.sender.toLowerCase()) {
          renderIncomingMessage(data);
        }
      });

      privateChannel.bind('delete-message', function(data) {
        removeMessageFromUIAndStorage(data.sender, data.id);
      });
    }

    // Fetch users from server API
    async function fetchUsersFromNeon() {
      try {
        const response = await fetch('/api/get-users');
        if (response.ok) {
          const data = await response.json();
          if (data.users && Array.isArray(data.users)) {
            data.users.forEach(u => addUserToSidebarAndDropdown(u));
          }
        }
      } catch (err) {
        console.error('Neon fetch failed:', err);
      }
    }
    fetchUsersFromNeon();

    // Dropdown Change Handler
    dropdownEl.addEventListener('change', (e) => {
      if (e.target.value) {
        const item = document.querySelector(`.sidebar-item[data-target="${e.target.value}"]`);
        if (item) switchChannel(e.target.value, item);
        dropdownEl.selectedIndex = 0;
      }
    });

    // Send Message
    const handleSend = async () => {
      const text = inputEl.value.trim();
      if (!text) return;

      const censoredText = filterProfanity(text);
      const isPrivate = activeRecipient !== 'global';
      const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const msgData = {
        id: msgId,
        sender: currentUser,
        recipient: activeRecipient,
        message: censoredText,
        replyTo: currentReplyTarget,
        created_at: new Date().toISOString()
      };

      if (isPrivate) {
        saveMessage(activeRecipient, msgData);
        renderIncomingMessage(msgData);
      }

      clearReplyTarget();
      inputEl.value = '';

      try {
        await fetch('/api/send-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isPrivate ? 'pm' : 'live',
            sender: currentUser,
            recipient: isPrivate ? activeRecipient : null,
            message: censoredText,
            replyTo: msgData.replyTo,
            id: msgId
          })
        });
      } catch (error) {
        console.error('Send error:', error);
      }
    };

    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

    // Reply Banner Handlers
    function setReplyTarget(sender, messageText) {
      currentReplyTarget = { sender, text: messageText };
      const shortText = getFirstThreeWords(messageText);
      replyBannerText.textContent = `Replying to @${sender}: "${shortText}..."`;
      replyBanner.style.display = 'flex';
      inputEl.focus();
    }

    function clearReplyTarget() {
      currentReplyTarget = null;
      replyBanner.style.display = 'none';
    }

    cancelReplyBtn.addEventListener('click', clearReplyTarget);

    // Delete Handlers
    async function deleteMessage(msgId) {
      removeMessageFromUIAndStorage(activeRecipient, msgId);

      try {
        await fetch('/api/send-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            id: msgId,
            sender: currentUser,
            recipient: activeRecipient
          })
        });
      } catch (err) {
        console.error('Delete request failed:', err);
      }
    }

    function removeMessageFromUIAndStorage(chatKey, msgId) {
      const el = document.querySelector(`.chat-message[data-id="${msgId}"]`);
      if (el) el.remove();

      const key = `chat_history_${chatKey.toLowerCase()}`;
      let history = JSON.parse(localStorage.getItem(key) || '[]');
      history = history.filter(m => m.id !== msgId);
      localStorage.setItem(key, JSON.stringify(history));
    }

    // Storage Helpers
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
        if (chatKey === 'global' && now - msgTime > 3600000) return;
        renderIncomingMessage(msg);
      });
    }

    // Populate Sidebar and Dropdown
    function addUserToSidebarAndDropdown(username) {
      if (!username || username.toLowerCase() === currentUser.toLowerCase() || username === 'Anonymous' || username === 'global') return;
      
      let savedUsers = JSON.parse(localStorage.getItem('chat_sidebar_users') || '[]');
      if (!savedUsers.includes(username)) {
        savedUsers.push(username);
        localStorage.setItem('chat_sidebar_users', JSON.stringify(savedUsers));
      }

      if (!dropdownEl.querySelector(`option[value="${username}"]`)) {
        const opt = document.createElement('option');
        opt.value = username;
        opt.textContent = username;
        dropdownEl.appendChild(opt);
      }

      if (!document.querySelector(`.sidebar-item[data-target="${username}"]`)) {
        const item = document.createElement('div');
        item.className = 'sidebar-item';
        item.dataset.target = username;
        item.textContent = `@ ${username}`;
        item.addEventListener('click', () => switchChannel(username, item));
        sidebarEl.appendChild(item);
      }
    }

    function switchChannel(target, element) {
      activeRecipient = target;
      titleEl.textContent = target === 'global' ? '# Global Chat' : `@ ${target}`;
      document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
      element.classList.add('active');
      clearReplyTarget();
      loadChatHistory(target);
    }

    document.querySelector('.sidebar-item[data-target="global"]').addEventListener('click', function() {
      switchChannel('global', this);
    });

    // Message Renderer with Fixed Dual-Swipe
    function renderIncomingMessage(msgData) {
      const { id, sender, message, created_at, replyTo } = msgData;
      const isPrivate = activeRecipient !== 'global';

      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-message ${isPrivate ? 'pm' : ''}`;
      if (id) msgDiv.dataset.id = id;
      
      const dateObj = created_at ? new Date(created_at) : new Date();
      const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let replyPrefixHTML = '';
      if (replyTo && replyTo.text) {
        const firstThree = getFirstThreeWords(replyTo.text);
        replyPrefixHTML = `<span class="reply-prefix">replying to "${escapeHtml(firstThree)}..."</span>`;
      }

      msgDiv.innerHTML = `
        <div>
          ${replyPrefixHTML}
          <span class="author">${escapeHtml(sender)}</span>
          <span class="timestamp">${timeFormatted}</span>
        </div>
        <div>${escapeHtml(message)}</div>
      `;

      // Encapsulated Swipe Logic
      let startX = 0;
      let currentX = 0;
      let isDragging = false;

      const processSwipeEnd = (deltaX) => {
        msgDiv.style.transform = 'translateX(0px)';
        
        // Swipe Right (deltaX > 35) -> Reply
        if (deltaX > 35) {
          setReplyTarget(sender, message);
        } 
        // Swipe Left (deltaX < -35) -> Delete Prompt
        else if (deltaX < -35) {
          if (sender.toLowerCase() === currentUser.toLowerCase() && id) {
            promptDeleteConfirmation(id);
          }
        }
      };

      // Touch Events
      msgDiv.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        currentX = startX;
      }, { passive: true });

      msgDiv.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        if (Math.abs(diffX) < 100) {
          msgDiv.style.transform = `translateX(${diffX}px)`;
        }
      }, { passive: true });

      msgDiv.addEventListener('touchend', () => {
        processSwipeEnd(currentX - startX);
        startX = 0; currentX = 0;
      });

      // Mouse Drag Events
      msgDiv.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        currentX = startX;
        isDragging = true;
      });

      const onMouseMove = (e) => {
        if (!isDragging) return;
        currentX = e.clientX;
        const diffX = currentX - startX;
        if (Math.abs(diffX) < 100) {
          msgDiv.style.transform = `translateX(${diffX}px)`;
        }
      };

      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        processSwipeEnd(currentX - startX);
        startX = 0; currentX = 0;
      };

      msgDiv.addEventListener('mousedown', () => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });

      chatContainer.appendChild(msgDiv);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      if (!isPrivate) {
        const remainingTime = 3600000 - (Date.now() - dateObj.getTime());
        if (remainingTime > 0) {
          setTimeout(() => { if (chatContainer.contains(msgDiv)) msgDiv.remove(); }, remainingTime);
        } else {
          msgDiv.remove();
        }
      }
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // Startup
    const savedUsers = JSON.parse(localStorage.getItem('chat_sidebar_users') || '[]');
    savedUsers.forEach(u => addUserToSidebarAndDropdown(u));
    loadChatHistory('global');
  }
});
