// Vercel Node function (CommonJS)
module.exports = async (req, res) => {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    if (!API_KEY) return res.status(500).json({ error: 'Missing OPENWEATHER_API_KEY' });

    const { city, lat, lon } = req.query || {};
    const base = 'https://api.openweathermap.org/data/2.5/weather';
    const qs = city
      ? `q=${encodeURIComponent(city)}`
      : (lat && lon ? `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` : null);

    if (!qs) return res.status(400).json({ error: 'Provide ?city= or ?lat=&lon=' });

    const url = `${base}?${qs}&appid=${API_KEY}&units=metric`;
    const r = await fetch(url);
    const json = await r.json();
    return res.status(r.status).json(json);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Upstream error' });
  }
};
