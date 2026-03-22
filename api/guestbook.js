import { kv } from '@vercel/kv';

const DEFAULT_ENTRIES = [
  { name: 'anonymous visitor', msg: 'sick page dude 🔥' }
];

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const entries = await kv.get('guests');
    return res.status(200).json(entries || DEFAULT_ENTRIES);
  }

  if (req.method === 'POST') {
    const { name, msg } = req.body;
    if (!msg) return res.status(400).json({ error: 'message required' });
    if (msg.length > 280) return res.status(400).json({ error: 'message too long (max 280 chars)' });
    if (name && name.length > 50) return res.status(400).json({ error: 'name too long (max 50 chars)' });

    // Rate limit: 3 entries per IP per hour
    const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const rlKey = `rl:gb:${ip}`;
    const rlCount = (await kv.get(rlKey)) || 0;
    if (rlCount >= 3) {
      return res.status(429).json({ error: 'too many entries, try again later' });
    }
    if (rlCount === 0) {
      await kv.set(rlKey, 1, { ex: 3600 });
    } else {
      await kv.set(rlKey, rlCount + 1, { ex: 3600 });
    }

    const entries = (await kv.get('guests')) || DEFAULT_ENTRIES;
    entries.unshift({ name: name || 'anonymous', msg });
    await kv.set('guests', entries);

    return res.status(200).json({ ok: true, entries });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
