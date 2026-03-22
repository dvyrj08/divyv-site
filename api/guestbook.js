import { kv } from '@vercel/kv';

const DEFAULT_ENTRIES = [
  { name: 'anonymous visitor', msg: 'sick page dude 🔥' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

    const entries = (await kv.get('guests')) || DEFAULT_ENTRIES;
    entries.unshift({ name: name || 'anonymous', msg });
    await kv.set('guests', entries);

    return res.status(200).json({ ok: true, entries });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
