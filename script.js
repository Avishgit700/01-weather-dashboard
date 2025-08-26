// Keep generic fetch
async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

async function loadWeatherData(city) {
  try {
    this.showLoading();

    let currentData, forecastData;

    if (USE_SERVER) {
      // Local dev → use your Express/Vercel endpoints
      [ currentData, forecastData ] = await Promise.all([
        fetchJSON(`/api/current?city=${encodeURIComponent(city)}`),
        fetchJSON(`/api/forecast?city=${encodeURIComponent(city)}`)
      ]);
    } else {
      // Production (no backend) → geocode then fetch by coords
      const g = await owmGeocode(city);
      if (!g) throw new Error('not_found');
      [ currentData, forecastData ] = await Promise.all([
        owmCurrentByCoords(g.lat, g.lon),
        owmForecastByCoords(g.lat, g.lon)
      ]);
      // pretty name in UI
      currentData.name = g.name;
      currentData.sys = currentData.sys || {};
      currentData.sys.country = g.country;
    }

    this.displayCurrentWeather(currentData);
    this.displayHourlyForecast(forecastData);
    this.displayDailyForecast(forecastData);
    localStorage.setItem('lastCity', city);
    this.hideLoading();
  } catch (e) {
    console.error(e);
    this.showError(`Unable to find weather data for "${city}". Check the name and try again.`);
  }
}

async function loadWeatherByCoords(lat, lon) {
  try {
    this.showLoading();

    let currentData, forecastData;

    if (USE_SERVER) {
      [ currentData, forecastData ] = await Promise.all([
        fetchJSON(`/api/current?lat=${lat}&lon=${lon}`),
        fetchJSON(`/api/forecast?lat=${lat}&lon=${lon}`)
      ]);
    } else {
      [ currentData, forecastData ] = await Promise.all([
        owmCurrentByCoords(lat, lon),
        owmForecastByCoords(lat, lon)
      ]);
    }

    this.displayCurrentWeather(currentData);
    this.displayHourlyForecast(forecastData);
    this.displayDailyForecast(forecastData);
    localStorage.setItem('lastCity', currentData?.name || 'Your location');
    this.hideLoading();
  } catch (e) {
    console.error(e);
    this.showError('Unable to get weather data for your location.');
  }
}
