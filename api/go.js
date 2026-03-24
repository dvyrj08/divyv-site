import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug || !/^[a-zA-Z0-9]{10,30}$/.test(slug)) {
    return res.redirect(302, '/');
  }

  // ── Log click ────────────────────────────────────────────────
  try {
    const ua = req.headers['user-agent'] || '';
    const isIOS     = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const device    = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

    const now   = Date.now();
    const logKey = `go:clicks:${slug}`;

    // Increment total click count
    await kv.incr(`go:count:${slug}`);

    // Push click entry (keep last 100)
    await kv.lpush(logKey, JSON.stringify({ ts: now, device }));
    await kv.ltrim(logKey, 0, 99);

    // 90-day expiry (same as share data)
    await kv.expire(`go:count:${slug}`, 7776000);
    await kv.expire(logKey, 7776000);
  } catch (e) {
    // Never block the redirect if logging fails
  }

  // ── Redirect to song page ────────────────────────────────────
  return res.redirect(302, `/song.html?id=${slug}`);
}
