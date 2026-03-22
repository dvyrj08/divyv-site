import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const DEFAULT_GUESTS = [
  { name: 'anonymous visitor', msg: 'sick page dude 🔥' }
];

async function getGuests() {
  const data = await redis.get('dv_guests');
  return data ? JSON.parse(data) : DEFAULT_GUESTS;
}

async function setGuests(entries) {
  await redis.set('dv_guests', JSON.stringify(entries));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return all entries
  if (req.method === 'GET') {
    const entries = await getGuests();
    return res.status(200).json(entries);
  }

  // POST — add a new entry
  if (req.method === 'POST') {
    const { name, msg } = req.body;

    if (!msg || !msg.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const entries = await getGuests();
    entries.unshift({
      name: (name && name.trim()) ? name.trim() : 'anonymous',
      msg: msg.trim()
    });
    await setGuests(entries);

    return res.status(200).json({ ok: true, entries });
  }

  return res.status(405).json({ error: 'Method not allowed.' });
}
