// WeatherNow – vanilla JS frontend that calls Vercel /api/* functions

class WeatherApp {
  constructor() {
    // Element refs
    this.els = {
      cityInput: document.getElementById('cityInput'),
      searchBtn: document.getElementById('searchBtn'),
      locationBtn: document.getElementById('locationBtn'),
      loading: document.getElementById('loading'),
      errorMessage: document.getElementById('errorMessage'),
      errorText: document.getElementById('errorText'),
      currentWeather: document.getElementById('currentWeather'),

      currentLocation: document.getElementById('currentLocation'),
      currentDate: document.getElementById('currentDate'),
      currentTime: document.getElementById('currentTime'),
      currentTemp: document.getElementById('currentTemp'),
      weatherIcon: document.getElementById('weatherIcon'),
      weatherDesc: document.getElementById('weatherDesc'),
      feelsLike: document.getElementById('feelsLike'),

      visibility: document.getElementById('visibility'),
      humidity: document.getElementById('humidity'),
      windSpeed: document.getElementById('windSpeed'),
      pressure: document.getElementById('pressure'),
      uvIndex: document.getElementById('uvIndex'),
      cloudiness: document.getElementById('cloudiness'),

      hourlyContainer: document.getElementById('hourlyContainer'),
      forecastContainer: document.getElementById('forecastContainer')
    };

    this.lastCity = localStorage.getItem('lastCity') || 'London';

    this.attachEvents();
    this.updateDateTime();
    this.tick = setInterval(() => this.updateDateTime(), 60_000);

    // kick-off
    this.loadWeatherData(this.lastCity);
  }

  attachEvents() {
    this.els.searchBtn.addEventListener('click', () => this.handleSearch());
    this.els.cityInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleSearch();
    });
    this.els.locationBtn.addEventListener('click', () => this.getCurrentLocation());
  }

  handleSearch() {
    const city = this.els.cityInput.value.trim();
    if (!city) return;
    this.loadWeatherData(city);
    this.els.cityInput.value = '';
  }

  getCurrentLocation() {
    if (!('geolocation' in navigator)) {
      this.showError('Geolocation is not supported by this browser.');
      return;
    }
    this.showLoading();
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => this.loadWeatherByCoords(coords.latitude, coords.longitude),
      (err) => {
        console.warn('Geolocation error:', err);
        this.showError('Unable to get your location. Please search for a city instead.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async loadWeatherData(city) {
    try {
      this.showLoading();

      const [current, forecast] = await Promise.all([
        this.fetchJSON(`/api/current?city=${encodeURIComponent(city)}`),
        this.fetchJSON(`/api/forecast?city=${encodeURIComponent(city)}`)
      ]);

      this.renderCurrent(current);
      this.renderHourly(forecast);
      this.renderDaily(forecast);

      localStorage.setItem('lastCity', city);
      this.hideLoading();
    } catch (e) {
      console.error(e);
      this.showError(`Unable to find weather data for "${city}". Please check the city name and try again.`);
    }
  }

  async loadWeatherByCoords(lat, lon) {
    try {
      this.showLoading();
      const qp = `lat=${lat}&lon=${lon}`;
      const [current, forecast] = await Promise.all([
        this.fetchJSON(`/api/current?${qp}`),
        this.fetchJSON(`/api/forecast?${qp}`)
      ]);

      this.renderCurrent(current);
      this.renderHourly(forecast);
      this.renderDaily(forecast);

      localStorage.setItem('lastCity', current?.name || 'Your location');
      this.hideLoading();
    } catch (e) {
      console.error(e);
      this.showError('Unable to get weather data for your location.');
    }
  }

  renderCurrent(data) {
    const { name, sys = {}, main = {}, weather = [], wind = {}, visibility = 0, clouds = {} } = data || {};
    const w = weather[0] || {};

    // Text
    this.els.currentLocation.textContent = [name, sys.country].filter(Boolean).join(', ');
    this.els.currentTemp.textContent = Number.isFinite(main.temp) ? `${Math.round(main.temp)}°C` : '—';
    this.els.weatherDesc.textContent = (w.description || '—').toString();
    this.els.feelsLike.textContent = Number.isFinite(main.feels_like) ? `Feels like ${Math.round(main.feels_like)}°C` : '—';

    // Icon
    this.els.weatherIcon.className = this.iconFor(w.icon, w.id);

    // Details
    this.els.visibility.textContent = `${(visibility / 1000).toFixed(1)} km`;
    this.els.humidity.textContent = `${main.humidity ?? '—'}%`;
    this.els.windSpeed.textContent = `${Math.round((wind.speed || 0) * 3.6)} km/h`;
    this.els.pressure.textContent = `${main.pressure ?? '—'} mb`;
    this.els.uvIndex.textContent = '—'; // (UV not in free OWM endpoints)
    this.els.cloudiness.textContent = `${clouds.all ?? '—'}%`;

    this.els.currentWeather.classList.remove('fade-in');
    // force reflow for animation restart
    // eslint-disable-next-line no-unused-expressions
    this.els.currentWeather.offsetHeight;
    this.els.currentWeather.classList.add('fade-in');
  }

  renderHourly(forecastData) {
    const items = (forecastData?.list || []).slice(0, 8);
    this.els.hourlyContainer.innerHTML = items.map((it) => {
      const t = new Date(it.dt * 1000);
      const h = t.getHours();
      const ampm = h === 0 ? '12 AM' : h <= 12 ? `${h} AM` : `${h - 12} PM`;
      return `
        <div class="hourly-item">
          <div class="time">${ampm}</div>
          <i class="${this.iconFor(it.weather?.[0]?.icon, it.weather?.[0]?.id)}"></i>
          <div class="temp">${Math.round(it.main?.temp)}°</div>
        </div>
      `;
    }).join('');
  }

  renderDaily(forecastData) {
    const groups = this.groupByDay(forecastData?.list || []);
    this.els.forecastContainer.innerHTML = groups.map((d) => `
      <div class="forecast-item">
        <div class="forecast-day">${d.day}</div>
        <div class="forecast-desc">
          <i class="${this.iconFor(d.icon, d.id)}"></i>
          <span>${d.description}</span>
        </div>
        <div class="forecast-temps">
          <span class="high">${d.high}°</span>
          <span class="low">${d.low}°</span>
        </div>
        <div class="forecast-humidity">${d.humidity}%</div>
      </div>
    `).join('');
  }

  groupByDay(list) {
    const days = {};
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const todayKey = new Date().toDateString();

    for (const item of list) {
      const d = new Date(item.dt * 1000);
      const key = d.toDateString();
      if (!days[key]) {
        days[key] = {
          key,
          day: key === todayKey ? 'Today' : dayNames[d.getDay()],
          temps: [],
          humidity: [],
          icon: item.weather?.[0]?.icon,
          id: item.weather?.[0]?.id,
          description: item.weather?.[0]?.description || ''
        };
      }
      days[key].temps.push(item.main?.temp);
      days[key].humidity.push(item.main?.humidity);
    }

    return Object.values(days)
      .slice(0, 5)
      .map((x) => ({
        day: x.day,
        high: Math.round(Math.max(...x.temps)),
        low: Math.round(Math.min(...x.temps)),
        humidity: Math.round(x.humidity.reduce((a, b) => a + b) / x.humidity.length),
        icon: x.icon,
        id: x.id,
        description: x.description
      }));
  }

  iconFor(code, id) {
    const map = {
      '01d': 'fas fa-sun', '01n': 'fas fa-moon',
      '02d': 'fas fa-cloud-sun', '02n': 'fas fa-cloud-moon',
      '03d': 'fas fa-cloud', '03n': 'fas fa-cloud',
      '04d': 'fas fa-cloud', '04n': 'fas fa-cloud',
      '09d': 'fas fa-cloud-rain', '09n': 'fas fa-cloud-rain',
      '10d': 'fas fa-cloud-sun-rain', '10n': 'fas fa-cloud-moon-rain',
      '11d': 'fas fa-bolt', '11n': 'fas fa-bolt',
      '13d': 'fas fa-snowflake', '13n': 'fas fa-snowflake',
      '50d': 'fas fa-smog', '50n': 'fas fa-smog'
    };
    return map[code] || 'fas fa-cloud';
  }

  updateDateTime() {
    const now = new Date();
    this.els.currentDate.textContent = now.toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    this.els.currentTime.textContent = now.toLocaleTimeString(undefined, {
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  }

  showLoading() {
    this.els.loading.classList.remove('hidden');
    this.els.errorMessage.classList.add('hidden');
    this.els.currentWeather.style.opacity = '0.7';
  }
  hideLoading() {
    this.els.loading.classList.add('hidden');
    this.els.currentWeather.style.opacity = '1';
  }
  showError(msg) {
    this.els.errorText.textContent = msg;
    this.els.errorMessage.classList.remove('hidden');
    this.els.loading.classList.add('hidden');
    this.els.currentWeather.style.opacity = '1';
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  new WeatherApp();
});

// NOTE: Service worker registration is already in index.html.
// Remove it there if you prefer to register it here instead.
