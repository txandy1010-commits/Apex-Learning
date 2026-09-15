import Pusher from "pusher";

const pusher = new Pusher({
  appId: "2194751",
  key: "c33c47677ef3d8d8a413",
  secret: "b2fbc6a907378a51f579",
  cluster: "us2",
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { type, sender, recipient, message } = req.body;

  try {
    // 1. Handle Live Chat Broadcast
    if (type === 'live') {
      await pusher.trigger('chat-room', 'new-message', {
        username: sender,
        message,
        timestamp: Date.now()
      });
      return res.status(200).json({ success: true });
    }

    // 2. Handle Private Message or Direct Chat Request via Pusher
    if (type === 'pm' || type === 'pm-request' || type === 'pm-accept') {
      if (!recipient) return res.status(400).json({ message: 'Recipient required' });

      // Target the recipient's individual user channel
      await pusher.trigger(`user-${recipient.toLowerCase()}`, 'pm-event', {
        type,
        sender,
        recipient,
        message,
        timestamp: Date.now()
      });

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ message: 'Invalid message type' });
  } catch (error) {
    console.error('Pusher error:', error);
    return res.status(500).json({ message: 'Failed to deliver message via Pusher' });
  }
}
