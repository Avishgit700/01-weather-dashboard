// api/current.js
const API = 'https://api.openweathermap.org';
const KEY = process.env.OPENWEATHER_API_KEY;

module.exports = async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    async function j(u){ const r=await fetch(u); if(!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }

    let lt = lat, ln = lon, name, country;

    if (!lt || !ln) {
      if (!city) return res.status(400).json({error:'missing_city'});
      const g = await j(`${API}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${KEY}`);
      if (!Array.isArray(g) || g.length === 0) {
        return res.status(404).json({ error:'not_found', message:`Could not find "${city}"` });
      }
      lt = g[0].lat; ln = g[0].lon; name = g[0].name; country = g[0].country;
    }

    const data = await j(`${API}/data/2.5/weather?lat=${lt}&lon=${ln}&units=metric&appid=${KEY}`);
    if (name) {
      data.name = name; data.sys = data.sys || {}; data.sys.country = country;
    }
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:'server_error' });
  }
};
