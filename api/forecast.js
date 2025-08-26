// /api/forecast.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return res.status(500).json({ error: 'Missing OPENWEATHER_API_KEY' });

  try {
    const { city, lat, lon } = req.query;
    let url;
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`;
    } else {
      return res.status(400).json({ error: 'Provide ?city= or ?lat=&lon=' });
    }

    const r = await fetch(url);
    const json = await r.json();
    return res.status(r.ok ? 200 : r.status).json(json);
  } catch (e) {
    return res.status(500).json({ error: 'Upstream error', details: String(e) });
  }
}
