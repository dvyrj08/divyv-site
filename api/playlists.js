const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;

  // 1. Get a fresh access token using the refresh token
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return res.status(500).json({ error: 'Failed to get access token', detail: tokenData });
  }

  // 2. Fetch user's playlists
  const playlistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!playlistsRes.ok) {
    const errBody = await playlistsRes.json().catch(() => ({}));
    return res.status(200).json({ playlists: [], _debug: { status: playlistsRes.status, error: errBody } });
  }

  const playlistsData = await playlistsRes.json();

  const allItems = (playlistsData.items || []);

  // 3. Filter own public non-empty playlists, sort by track count desc, take top 3
  const top3 = allItems
    .filter(p => p.owner?.id === '316stuthlrdjaz2bwhrtri3gi54q')
    .filter(p => p.public !== false)
    .filter(p => (p.items?.total || 0) > 0)
    .sort((a, b) => (b.items?.total || 0) - (a.items?.total || 0))
    .slice(0, 3)
    .map(p => ({
      name: p.name,
      trackCount: p.items?.total || 0,
      coverArt: p.images?.[0]?.url || null,
      url: p.external_urls?.spotify || '#',
    }));

  return res.status(200).json({ playlists: top3 });
}
