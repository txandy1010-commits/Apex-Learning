import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, sender, recipient, message, id, replyTo } = req.body;

  try {
    if (action === 'global') {
      await pusher.trigger('global-chat', 'message', {
        id,
        sender,
        message,
        replyTo,
        created_at: new Date().toISOString()
      });
    } else if (action === 'pm') {
      // Trigger for recipient
      await pusher.trigger(`user-${recipient.toLowerCase()}`, 'direct-message', {
        id,
        sender,
        message,
        replyTo,
        created_at: new Date().toISOString()
      });
    } else if (action === 'delete') {
      const channel = recipient === 'global' ? 'global-chat' : `user-${recipient.toLowerCase()}`;
      const eventName = recipient === 'global' ? 'delete-message' : 'delete-message';
      await pusher.trigger(channel, eventName, { id });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Pusher Trigger Error:', error);
    return res.status(500).json({ error: 'Failed to broadcast message' });
  }
}
