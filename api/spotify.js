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

  // 2. Try currently playing first
  const nowPlayingRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (nowPlayingRes.status === 200) {
    const nowPlaying = await nowPlayingRes.json();
    if (nowPlaying && nowPlaying.item) {
      return res.status(200).json({
        isPlaying: nowPlaying.is_playing,
        title: nowPlaying.item.name,
        artist: nowPlaying.item.artists.map((a) => a.name).join(', '),
        album: nowPlaying.item.album.name,
        albumArt: nowPlaying.item.album.images[0]?.url || null,
        songUrl: nowPlaying.item.external_urls.spotify,
      });
    }
  }

  // 3. Fall back to recently played
  const recentRes = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const recentData = await recentRes.json();
  const track = recentData?.items?.[0]?.track;

  if (!track) {
    return res.status(200).json({ isPlaying: false, title: null });
  }

  return res.status(200).json({
    isPlaying: false,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images[0]?.url || null,
    songUrl: track.external_urls.spotify,
  });
}
