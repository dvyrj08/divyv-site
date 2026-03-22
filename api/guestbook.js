import { kv } from '@vercel/kv';

const DEFAULT_GUESTS = [
  { name: 'anonymous visitor', msg: 'sick page dude 🔥' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return all entries
  if (req.method === 'GET') {
    const entries = await kv.get('dv_guests');
    return res.status(200).json(entries || DEFAULT_GUESTS);
  }

  // POST — add a new entry
  if (req.method === 'POST') {
    const { name, msg } = req.body;

    if (!msg || !msg.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const entries = (await kv.get('dv_guests')) || DEFAULT_GUESTS;
    entries.unshift({
      name: (name && name.trim()) ? name.trim() : 'anonymous',
      msg: msg.trim()
    });
    await kv.set('dv_guests', entries);

    return res.status(200).json({ ok: true, entries });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
