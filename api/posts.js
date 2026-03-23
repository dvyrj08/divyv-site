import { kv } from '@vercel/kv';

const VALID_CODES = process.env.INVITE_CODES
  ? process.env.INVITE_CODES.split(',').map(c => c.trim().toUpperCase())
  : ['DIVY2026', 'COFFEE404', 'TORONTO99', 'PIXEL001',
     'RETRO777', 'BUGFIXER', 'DEVMODE0', 'STARFIELD',
     'PURPLEHZ', 'NEON2026', 'HACKTIME', 'BUILDSZN'];

const MASTER_DELETE_CODE = process.env.MASTER_DELETE_CODE || null;

const DEFAULT_POSTS = [
  { id: '1', text: "why does CSS work perfectly in my head and nowhere else", tag: "dev", date: "mar 20" },
  { id: '2', text: "toronto in march is just november with better propaganda", tag: "life", date: "mar 19" },
  { id: '3', text: "built something cool today. it broke by end of day. classic.", tag: "dev", date: "mar 18" },
];

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
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
    if (text.length > 500) return res.status(400).json({ error: 'post too long (max 500 chars)' });
    if (tag && tag.length > 30) return res.status(400).json({ error: 'tag too long (max 30 chars)' });

    const upper = code.toUpperCase().trim();
    if (!VALID_CODES.includes(upper)) {
      return res.status(403).json({ error: 'invalid code' });
    }

    // Rate limit: 5 posts per IP per hour
    const ip = (req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
    const rlKey = `rl:post:${ip}`;
    const rlCount = (await kv.get(rlKey)) || 0;
    if (rlCount >= 5) {
      return res.status(429).json({ error: 'too many posts, try again later' });
    }
    if (rlCount === 0) {
      await kv.set(rlKey, 1, { ex: 3600 });
    } else {
      await kv.set(rlKey, rlCount + 1, { ex: 3600 });
    }

    const posts = (await kv.get('posts')) || DEFAULT_POSTS;
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    posts.unshift({ id: Date.now().toString(), text, tag: tag || '', date });

    await kv.set('posts', posts);

    return res.status(200).json({ ok: true, posts });
  }

  if (req.method === 'DELETE') {
    const { id, code } = req.body;

    if (code === undefined || id === undefined) {
      return res.status(400).json({ error: 'missing fields' });
    }

    if (!MASTER_DELETE_CODE) {
      return res.status(403).json({ error: 'deletion not configured' });
    }
    if (code.trim() !== MASTER_DELETE_CODE) {
      return res.status(403).json({ error: 'invalid code' });
    }

    const posts = (await kv.get('posts')) || DEFAULT_POSTS;
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) {
      return res.status(400).json({ error: 'post not found' });
    }

    posts.splice(index, 1);
    await kv.set('posts', posts);

    return res.status(200).json({ ok: true, posts });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
