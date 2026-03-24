import { kv } from '@vercel/kv';

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET ?id=trackId ──────────────────────────────────────────
  if (req.method === 'GET') {
    const { id } = req.query;
    if (!id || !/^[a-zA-Z0-9]{10,30}$/.test(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    const song = await kv.get(`share:${id}`);
    if (!song) return res.status(404).json({ error: 'track not found' });
    return res.status(200).json(song);
  }

  // ── POST ─────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { title, artist, album, albumArt, songUrl } = req.body;
    if (!title || !artist || !songUrl) {
      return res.status(400).json({ error: 'missing required fields' });
    }

    const trackId = songUrl.split('?')[0].split('/').pop();
    if (!trackId || !/^[a-zA-Z0-9]{10,30}$/.test(trackId)) {
      return res.status(400).json({ error: 'could not determine track id' });
    }

    await kv.set(`share:${trackId}`, { title, artist, album: album || '', albumArt: albumArt || null, songUrl, trackId, sharedAt: new Date().toISOString() }, { ex: 7776000 });

    return res.status(200).json({ url: `https://divyv.vercel.app/go/${trackId}` });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
