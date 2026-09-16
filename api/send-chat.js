import Pusher from "pusher";

// Initialize Pusher using environment variables for security
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER || "us2",
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Accept either 'type' or 'action' so front-end calls work smoothly
  const { type, action, sender, recipient, message } = req.body;
  const msgType = type || action;

  if (!sender || !message) {
    return res.status(400).json({ message: 'Sender and message required' });
  }

  try {
    // 1. Live Global Chat Broadcast
    if (msgType === 'live') {
      await pusher.trigger('global-chat', 'message', {
        sender,
        message,
        created_at: new Date().toISOString()
      });
      return res.status(200).json({ success: true });
    }

    // 2. Direct Message to Specific User Channel
    if (msgType === 'pm' || recipient) {
      if (!recipient) {
        return res.status(400).json({ message: 'Recipient required for direct messages' });
      }

      await pusher.trigger(`user-${recipient.toLowerCase()}`, 'direct-message', {
        sender,
        recipient: recipient.toLowerCase(),
        message,
        created_at: new Date().toISOString()
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ message: 'Invalid message payload' });
  } catch (error) {
    console.error('Pusher dispatch error:', error);
    return res.status(500).json({ message: 'Failed to deliver message via Pusher' });
  }
}
