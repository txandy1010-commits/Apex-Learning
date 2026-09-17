import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, id, sender, recipient, message, replyTo } = req.body;

  try {
    // 1. Handle Message Deletion
    if (action === 'delete') {
      if (recipient === 'global') {
        await pusher.trigger('global-chat', 'delete-message', { id });
      } else if (recipient) {
        await pusher.trigger(`user-${recipient.toLowerCase()}`, 'delete-message', { id });
        await pusher.trigger(`user-${sender.toLowerCase()}`, 'delete-message', { id });
      }
      return res.status(200).json({ success: true, action: 'deleted' });
    }

    // 2. Handle Direct Messages
    if (action === 'pm' && recipient) {
      await pusher.trigger(`user-${recipient.toLowerCase()}`, 'direct-message', {
        id, sender, recipient, message, replyTo, created_at: new Date().toISOString()
      });
      return res.status(200).json({ success: true });
    }

    // 3. Handle Global Live Messages
    await pusher.trigger('global-chat', 'message', {
      id, sender, message, replyTo, created_at: new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Pusher error:', error);
    return res.status(500).json({ error: error.message });
  }
}
