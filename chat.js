// Ensure Pusher client library is loaded before running
if (typeof Pusher === 'undefined') {
  console.error('Pusher JS library is missing. Please include it in your HTML: <script src="https://js.pusher.com/8.0/pusher.min.js"></script>');
}

// 1. Initialize Pusher Frontend Client
const PUSHER_KEY = 'c33c47677ef3d8d8a413'; // Your public key
const PUSHER_CLUSTER = 'us2';

const pusher = new Pusher(PUSHER_KEY, {
  cluster: PUSHER_CLUSTER
});

// Current user state
const currentUser = localStorage.getItem('loggedUser') || 'Anonymous';
const currentRole = localStorage.getItem('role') || 'user';

// Active chat recipient ('global' or a specific username)
let activeRecipient = 'global';

// 2. Subscribe to Global Chat Channel
const globalChannel = pusher.subscribe('global-chat');
globalChannel.bind('message', function(data) {
  renderIncomingMessage(data.sender, data.message, data.created_at, false);
});

// 3. Subscribe to User-Specific Private Channel
if (currentUser !== 'Anonymous') {
  const privateChannel = pusher.subscribe(`user-${currentUser.toLowerCase()}`);
  privateChannel.bind('direct-message', function(data) {
    // Render private message if chatting with sender, or show notification
    if (activeRecipient.toLowerCase() === data.sender.toLowerCase()) {
      renderIncomingMessage(data.sender, data.message, data.created_at, true);
    } else {
      showNotification(`New message from ${data.sender}`);
    }
  });
}

// 4. Function to Send Messages via Backend Endpoint
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
    const response = await fetch('/api/send-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.success) {
      console.error('Failed to send message:', result.message);
    }
  } catch (error) {
    console.error('Network error sending message:', error);
  }
}

// 5. Helper Functions for UI Integration
function renderIncomingMessage(sender, message, timestamp, isPrivate) {
  const chatContainer = document.getElementById('chatContainer');
  if (!chatContainer) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender === currentUser ? 'sent' : 'received'} ${isPrivate ? 'pm' : ''}`;
  
  const timeFormatted = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgDiv.innerHTML = `<strong>${sender}</strong> [${timeFormatted}]: ${escapeHtml(message)}`;
  
  chatContainer.appendChild(msgDiv);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function showNotification(text) {
  console.log('Notification:', text);
  // Add custom UI notification banner logic here if desired
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Expose sendMessage globally for HTML input handling
window.sendMessage = sendMessage;
window.setActiveRecipient = function(recipient) {
  activeRecipient = recipient;
};
