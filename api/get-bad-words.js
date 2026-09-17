import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT word FROM bad_words`;
    const badWords = rows.map(r => r.word);

    return res.status(200).json({ badWords });
  } catch (error) {
    console.error('Failed to fetch bad words:', error);
    return res.status(500).json({ error: 'Database connection error' });
  }
}
