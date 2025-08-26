// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

// --- config ---
const API = 'https://api.openweathermap.org';
const KEY = process.env.OPENWEATHER_API_KEY;
if (!KEY) {
  console.warn('⚠️  Missing OPENWEATHER_API_KEY in .env');
}

// serve static files (index.html, styles.css, script.js, sw.js)
app.use(express.static(path.join(__dirname)));

// small helper: build URL with query params
function buildUrl(base, params) {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) if (v != null) u.searchParams.set(k, v);
  return u.toString();
}

// Geocode any text to lat/lon (returns first match or null)
async function geocode(q) {
  const url = buildUrl(`${API}/geo/1.0/direct`, { q, limit: 1, appid: KEY });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Geocode HTTP ${r.status}`);
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

// Fetch current weather by lat/lon
async function getCurrentByCoords(lat, lon) {
  const url = buildUrl(`${API}/data/2.5/weather`, { lat, lon, units: 'metric', appid: KEY });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Weather HTTP ${r.status}`);
  return await r.json();
}

// Fetch 5-day / 3-hour forecast by lat/lon
async function getForecastByCoords(lat, lon) {
  const url = buildUrl(`${API}/data/2.5/forecast`, { lat, lon, units: 'metric', appid: KEY });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Forecast HTTP ${r.status}`);
  return await r.json();
}

// GET /api/current?city=London   or   /api/current?lat=..&lon=..
app.get('/api/current', async (req, res) => {
  try {
    let { city, lat, lon } = req.query;

    // If coords provided, use them directly
    if (lat && lon) {
      const data = await getCurrentByCoords(lat, lon);
      return res.json(data);
    }

    // Otherwise geocode whatever text we got (city/country/typo)
    if (!city || !city.trim()) {
      return res.status(400).json({ error: 'missing_city', message: 'Provide ?city=...' });
    }

    const g = await geocode(city.trim());
    if (!g) {
      return res.status(404).json({
        error: 'not_found',
        message: `Could not find a place for "${city}". Try a city like "Sydney" or "Sydney, AU".`
      });
    }

    const data = await getCurrentByCoords(g.lat, g.lon);
    // annotate with geocode name/country so UI looks nicer
    data.name = g.name || data.name;
    data.sys = data.sys || {};
    data.sys.country = g.country || data.sys.country;
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch current weather' });
  }
});

// GET /api/forecast?city=London  or  /api/forecast?lat=..&lon=..
app.get('/api/forecast', async (req, res) => {
  try {
    let { city, lat, lon } = req.query;

    if (lat && lon) {
      const data = await getForecastByCoords(lat, lon);
      return res.json(data);
    }

    if (!city || !city.trim()) {
      return res.status(400).json({ error: 'missing_city', message: 'Provide ?city=...' });
    }

    const g = await geocode(city.trim());
    if (!g) {
      return res.status(404).json({
        error: 'not_found',
        message: `Could not find a place for "${city}". Try a city like "Melbourne" or "Melbourne, AU".`
      });
    }

    const data = await getForecastByCoords(g.lat, g.lon);
    return res.json(data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server_error', message: 'Failed to fetch forecast' });
  }
});

// Optional: place suggestions for a typeahead
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const url = buildUrl(`${API}/geo/1.0/direct`, { q, limit: 5, appid: KEY });
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Search HTTP ${r.status}`);
    const out = (await r.json()).map(x => ({
      name: x.name,
      state: x.state || '',
      country: x.country,
      lat: x.lat,
      lon: x.lon
    }));
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json([]);
  }
});

// Start server
const PORT = Number(process.env.PORT) || 5173;
app.listen(PORT, () => console.log(`🌤  Weather app running at http://localhost:${PORT}`));
