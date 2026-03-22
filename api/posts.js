import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

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

async function getPosts() {
  const data = await redis.get('dv_posts');
  return data ? JSON.parse(data) : DEFAULT_POSTS;
}

async function setPosts(posts) {
  await redis.set('dv_posts', JSON.stringify(posts));
}

async function getUsedCodes() {
  const data = await redis.get('dv_used_codes');
  return data ? JSON.parse(data) : [];
}

async function setUsedCodes(codes) {
  await redis.set('dv_used_codes', JSON.stringify(codes));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return all posts
  if (req.method === 'GET') {
    const posts = await getPosts();
    return res.status(200).json(posts);
  }

  // POST — add a new post
  if (req.method === 'POST') {
    const { text, tag, code } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Post text is required.' });
    }
    if (!code) {
      return res.status(400).json({ error: 'Invite code required to post.' });
    }

    const upper = code.toUpperCase().trim();
    if (!VALID_CODES.includes(upper)) {
      return res.status(403).json({ error: 'Invalid or already used code.' });
    }

    const usedCodes = await getUsedCodes();
    if (usedCodes.includes(upper)) {
      return res.status(403).json({ error: 'Invalid or already used code.' });
    }

    usedCodes.push(upper);
    await setUsedCodes(usedCodes);

    const posts = await getPosts();
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    posts.unshift({ text: text.trim(), tag: tag ? tag.trim() : '', date });
    await setPosts(posts);

    return res.status(200).json({ ok: true, posts });
  }

  // DELETE — remove a post by index
  if (req.method === 'DELETE') {
    const { index, code } = req.body;

    if (index === undefined || index === null) {
      return res.status(400).json({ error: 'Index required.' });
    }
    if (!code) {
      return res.status(400).json({ error: 'Invite code required to delete.' });
    }

    const upper = code.toUpperCase().trim();
    if (!VALID_CODES.includes(upper)) {
      return res.status(403).json({ error: 'Invalid code.' });
    }

    const posts = await getPosts();
    if (index < 0 || index >= posts.length) {
      return res.status(400).json({ error: 'Invalid index.' });
    }
    posts.splice(index, 1);
    await setPosts(posts);

    return res.status(200).json({ ok: true, posts });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
