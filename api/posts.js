import { kv } from '@vercel/kv';

const VALID_CODES = [
  'DIVY2026', 'COFFEE404', 'TORONTO99', 'PIXEL001',
  'RETRO777', 'BUGFIXER', 'DEVMODE0', 'STARFIELD',
  'PURPLEHZ', 'NEON2026', 'HACKTIME', 'BUILDSZN'
];

const DEFAULT_POSTS = [
  { text: "why does CSS work perfectly in my head and nowhere else", tag: "dev", date: "mar 20" },
  { text: "toronto in march is just november with better propaganda", tag: "life", date: "mar 19" },
  { text: "built something cool today. it broke by end of day. classic.", tag: "dev", date: "mar 18" },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const posts = await kv.get('posts');
    return res.status(200).json(posts || DEFAULT_POSTS);
  }

  if (req.method === 'POST') {
    const { text, tag, code } = req.body;

    if (!text || !code) return res.status(400).json({ error: 'missing fields' });

    const upper = code.toUpperCase().trim();
    if (!VALID_CODES.includes(upper)) {
      return res.status(403).json({ error: 'invalid or already used code' });
    }

    const usedCodes = (await kv.get('used_codes')) || [];
    if (usedCodes.includes(upper)) {
      return res.status(403).json({ error: 'invalid or already used code' });
    }

    const posts = (await kv.get('posts')) || DEFAULT_POSTS;
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    posts.unshift({ text, tag: tag || '', date });

    await kv.set('posts', posts);
    await kv.set('used_codes', [...usedCodes, upper]);

    return res.status(200).json({ ok: true, posts });
  }

  if (req.method === 'DELETE') {
    const { index, code } = req.body;

    if (code === undefined || index === undefined) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const upper = code.toUpperCase().trim();
    if (!VALID_CODES.includes(upper)) {
      return res.status(403).json({ error: 'invalid code' });
    }

    const posts = (await kv.get('posts')) || DEFAULT_POSTS;
    if (index < 0 || index >= posts.length) {
      return res.status(400).json({ error: 'invalid index' });
    }

    posts.splice(index, 1);
    await kv.set('posts', posts);

    return res.status(200).json({ ok: true, posts });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
