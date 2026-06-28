// LaundryLux Chat API — stores messages per room

const messages = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.method === 'POST' ? req.body : {};
  const query = req.query || {};
  const roomId = body.roomId || query.roomId;

  if (!roomId) return res.status(400).json({ error: 'roomId required' });
  if (!messages[roomId]) messages[roomId] = [];

  if (req.method === 'POST') {
    const { role, text } = body;
    if (!text || !role) return res.status(400).json({ error: 'text and role required' });
    const msg = {
      role, text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages[roomId].push(msg);
    if (messages[roomId].length > 100) messages[roomId] = messages[roomId].slice(-100);
    return res.status(200).json({ success: true, msg });
  }

  if (req.method === 'GET') {
    const since = parseInt(query.since || '0');
    const all = messages[roomId] || [];
    return res.status(200).json({
      messages: all,
      newMessages: all.slice(since),
      total: all.length
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
