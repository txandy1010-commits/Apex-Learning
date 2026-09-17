import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { action, id, sender, recipient, message, replyTo } = req.body;

  try {
    // HANDLE DELETION
    if (action === 'delete') {
      if (recipient && recipient !== 'global') {
        // Trigger deletion in private channel
        await pusher.trigger(`user-${recipient.toLowerCase()}`, 'delete-message', { id });
        await pusher.trigger(`user-${sender.toLowerCase()}`, 'delete-message', { id });
      } else {
        // Trigger deletion in global channel
        await pusher.trigger('global-chat', 'delete-message', { id });
      }
      return res.status(200).json({ success: true });
    }

    // HANDLE SENDING MESSAGES
    if (action === 'pm') {
      await pusher.trigger(`user-${recipient.toLowerCase()}`, 'direct-message', {
        id, sender, recipient, message, replyTo, created_at: new Date().toISOString()
      });
    } else {
      await pusher.trigger('global-chat', 'message', {
        id, sender, recipient: 'global', message, replyTo, created_at: new Date().toISOString()
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
