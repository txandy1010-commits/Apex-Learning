import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  const ownerAuth = req.headers['x-owner-auth'];
  if (!ownerAuth) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ success: false, message: 'Missing DATABASE_URL' });
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const rows = await sql`
        SELECT 
          s.id,
          s.username,
          s.started_at,
          s.ended_at,
          s.status,
          EXTRACT(EPOCH FROM (COALESCE(s.ended_at, NOW()) - s.started_at))::int AS duration_seconds,
          COALESCE(
            json_agg(
              json_build_object('visited_at', p.visited_at, 'page', p.page)
              ORDER BY p.visited_at ASC
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'
          ) AS page_history
        FROM user_sessions s
        LEFT JOIN page_views p ON s.id = p.session_id
        WHERE s.started_at >= NOW() - INTERVAL '3 days'
        GROUP BY s.id
        ORDER BY s.started_at DESC;
      `;

      return res.status(200).json({
        success: true,
        sessions: rows
      });
    } else {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Database query error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}
