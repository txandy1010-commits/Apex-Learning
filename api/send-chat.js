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

  const { username, message } = req.body;

  if (!username || !message) {
    return res.status(400).json({ message: 'Missing username or message.' });
  }

  try {
    await pusher.trigger('chat-room', 'new-message', {
      username,
      message,
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Pusher trigger error:', error);
    return res.status(500).json({ message: 'Failed to broadcast message.' });
  }
}
