require('dotenv').config();
const express = require('express');
const path = require('path');

if (typeof fetch !== 'function') {
  console.error('Node 18+ is required (for global fetch). Update Node.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5173;
const API_KEY = process.env.OPENWEATHER_API_KEY;

if (!API_KEY) {
  console.warn('WARNING: OPENWEATHER_API_KEY is not set. Create .env (step 4).');
}

// Serve static files (index.html, styles.css, script.js, sw.js) from project root
app.use(express.static(path.join(__dirname)));

// /api/current?city=London   or   /api/current?lat=..&lon=..
app.get('/api/current', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    let url;
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: 'Provide city or lat/lon' });
    }
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream: ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// /api/forecast?city=London   or   /api/forecast?lat=..&lon=..
app.get('/api/forecast', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    let url;
    if (city) {
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    } else if (lat && lon) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    } else {
      return res.status(400).json({ error: 'Provide city or lat/lon' });
    }
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ error: `Upstream: ${r.status}` });
    res.json(await r.json());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// (Optional SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌤  Weather app running at http://localhost:${PORT}`);
});
