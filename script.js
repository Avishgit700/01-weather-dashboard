class WeatherApp {
  constructor() {
    this.elements = {
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
    this.init();
  }

  init() {
    this.attachEvents();
    this.updateDateTime();
    this.loadWeatherData(this.lastCity);
    setInterval(() => this.updateDateTime(), 60_000);
  }

  attachEvents() {
    this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
    this.elements.cityInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSearch(); });
    this.elements.locationBtn.addEventListener('click', () => this.getCurrentLocation());
  }

  handleSearch() {
    const city = this.elements.cityInput.value.trim();
    if (!city) return;
    this.loadWeatherData(city);
    this.elements.cityInput.value = '';
  }

  getCurrentLocation() {
    if (!navigator.geolocation) return this.showError('Geolocation not supported.');
    this.showLoading();
    navigator.geolocation.getCurrentPosition(
      pos => this.loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      err => {
        console.error(err);
        this.showError('Unable to get your location. Please search for a city instead.');
      }
    );
  }

  async fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  }

  async loadWeatherData(city) {
    try {
      this.showLoading();
      const [currentData, forecastData] = await Promise.all([
        this.fetchJSON(`/api/current?city=${encodeURIComponent(city)}`),
        this.fetchJSON(`/api/forecast?city=${encodeURIComponent(city)}`)
      ]);
      this.displayCurrentWeather(currentData);
      this.displayHourlyForecast(forecastData);
      this.displayDailyForecast(forecastData);
      localStorage.setItem('lastCity', city);
      this.hideLoading();
    } catch (e) {
      console.error(e);
      this.showError(`Unable to find weather data for "${city}".`);
    }
  }

  async loadWeatherByCoords(lat, lon) {
    try {
      this.showLoading();
      const qp = `lat=${lat}&lon=${lon}`;
      const [currentData, forecastData] = await Promise.all([
        this.fetchJSON(`/api/current?${qp}`),
        this.fetchJSON(`/api/forecast?${qp}`)
      ]);
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

  displayCurrentWeather(data) {
    const { name, sys, main, weather, wind, visibility, clouds } = data;
    this.elements.currentLocation.textContent = `${name || '—'}, ${sys?.country || ''}`;
    this.elements.currentTemp.textContent = `${Math.round(main?.temp ?? 0)}°C`;
    this.elements.weatherDesc.textContent = weather?.[0]?.description ?? '—';
    this.elements.feelsLike.textContent = `Feels like ${Math.round(main?.feels_like ?? 0)}°C`;

    // icon
    this.elements.weatherIcon.className = this.iconFromOWM(weather?.[0]?.icon);

    // details
    this.elements.visibility.textContent = visibility != null ? `${(visibility/1000).toFixed(1)} km` : '—';
    this.elements.humidity.textContent = main?.humidity != null ? `${main.humidity}%` : '—';
    this.elements.windSpeed.textContent = wind?.speed != null ? `${Math.round(wind.speed * 3.6)} km/h` : '—';
    this.elements.pressure.textContent = main?.pressure != null ? `${main.pressure} mb` : '—';
    this.elements.uvIndex.textContent = '—'; // (not in free API)
    this.elements.cloudiness.textContent = clouds?.all != null ? `${clouds.all}%` : '—';
  }

  displayHourlyForecast(data) {
    const hours = data.list.slice(0, 8);
    this.elements.hourlyContainer.innerHTML = hours.map(item => {
      const time = new Date(item.dt * 1000);
      const hour = time.getHours();
      const label = hour === 0 ? '12 AM' : (hour <= 12 ? `${hour} AM` : `${hour-12} PM`);
      return `
        <div class="hourly-item">
          <div class="time">${label}</div>
          <i class="${this.iconFromOWM(item.weather[0].icon)}"></i>
          <div class="temp">${Math.round(item.main.temp)}°</div>
        </div>
      `;
    }).join('');
  }

  displayDailyForecast(data) {
    const grouped = this.groupByDay(data.list);
    this.elements.forecastContainer.innerHTML = grouped.map(day => `
      <div class="forecast-item">
        <div class="forecast-day">${day.day}</div>
        <div class="forecast-desc"><i class="${this.iconFromOWM(day.icon)}"></i><span>${day.description}</span></div>
        <div class="forecast-temps"><span class="high">${day.high}°</span><span class="low">${day.low}°</span></div>
        <div class="forecast-humidity">${day.humidity}%</div>
      </div>
    `).join('');
  }

  groupByDay(list) {
    const map = new Map();
    const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const todayStr = new Date().toDateString();

    for (const item of list) {
      const date = new Date(item.dt * 1000);
      const key = date.toDateString();
      if (!map.has(key)) {
        map.set(key, {
          label: key === todayStr ? 'Today' : dn[date.getDay()],
          temps: [],
          humidity: [],
          icon: item.weather[0].icon,
          description: item.weather[0].description
        });
      }
      const bucket = map.get(key);
      bucket.temps.push(item.main.temp);
      bucket.humidity.push(item.main.humidity);
    }

    return Array.from(map.entries()).slice(0, 5).map(([_, v]) => ({
      day: v.label,
      high: Math.round(Math.max(...v.temps)),
      low: Math.round(Math.min(...v.temps)),
      humidity: Math.round(v.humidity.reduce((a,b)=>a+b,0) / v.humidity.length),
      icon: v.icon,
      description: v.description
    }));
  }

  iconFromOWM(code) {
    const m = {
      '01d':'fas fa-sun', '01n':'fas fa-moon',
      '02d':'fas fa-cloud-sun', '02n':'fas fa-cloud-moon',
      '03d':'fas fa-cloud', '03n':'fas fa-cloud',
      '04d':'fas fa-cloud', '04n':'fas fa-cloud',
      '09d':'fas fa-cloud-rain','09n':'fas fa-cloud-rain',
      '10d':'fas fa-cloud-sun-rain','10n':'fas fa-cloud-moon-rain',
      '11d':'fas fa-bolt','11n':'fas fa-bolt',
      '13d':'fas fa-snowflake','13n':'fas fa-snowflake',
      '50d':'fas fa-smog','50n':'fas fa-smog'
    };
    return m[code] || 'fas fa-cloud';
  }

  updateDateTime() {
    const now = new Date();
    this.elements.currentDate.textContent = now.toLocaleDateString(undefined, {
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    });
    this.elements.currentTime.textContent = now.toLocaleTimeString(undefined, {
      hour:'numeric', minute:'2-digit'
    });
  }

  showLoading(){
    this.elements.loading.classList.remove('hidden');
    this.elements.errorMessage.classList.add('hidden');
  }
  hideLoading(){
    this.elements.loading.classList.add('hidden');
  }
  showError(msg){
    this.elements.errorText.textContent = msg;
    this.elements.errorMessage.classList.remove('hidden');
    this.hideLoading();
  }
}

document.addEventListener('DOMContentLoaded', () => new WeatherApp());

// Optional offline shell
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  });
}
