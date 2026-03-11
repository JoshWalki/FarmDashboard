export function formatGameTime(dayTimeMinutes) {
  const hours = Math.floor(dayTimeMinutes / 60);
  const minutes = Math.floor(dayTimeMinutes % 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function getGameTimeDisplay() {
  if (!this.gameTime) {
    if (this.realtimeConnector?.isConnected) {
      return "Waiting for game time data...";
    }
    if (!this.savedFolderData?.environmentData) {
      return "Time: environment.xml not found";
    }
    return "Time: Unable to parse environment data";
  }

  if (typeof this.gameTime === "string") return this.gameTime;

  if ((this.gameTime.hour !== undefined || this.gameTime.minute !== undefined) &&
      (this.gameTime.currentDay !== undefined || this.gameTime.day !== undefined)) {
    const hour = parseInt(this.gameTime.hour) || 0;
    const minute = parseInt(this.gameTime.minute) || 0;
    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
  }

  if (this.gameTime.dayTime !== undefined &&
      (this.gameTime.currentDay !== undefined || this.gameTime.day !== undefined)) {
    let dayTimeMinutes = parseInt(this.gameTime.dayTime) || 0;
    if (dayTimeMinutes > 1440) {
      dayTimeMinutes = Math.floor(dayTimeMinutes / 1000 / 60); 
    }
    return this.formatGameTime(dayTimeMinutes);
  }
  return `Time format error: ${JSON.stringify(this.gameTime)}`;
}

export function updateGameTimeDisplay() {
  const gameTimeElement = document.getElementById("game-time-display");
  if (gameTimeElement) {
    gameTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${this.getGameTimeDisplay()}`;
  }
  const navbarGameTime = document.getElementById("navbar-game-time");
  if (navbarGameTime) {
    navbarGameTime.innerHTML = `<i class="bi bi-clock me-1"></i><span>${this.getGameTimeDisplay()}</span>`;
    navbarGameTime.classList.remove("d-none");
  }
  this.updateWeatherDisplay();
}

export function getWeatherIcon(weatherType) {
  const type = (weatherType || 'unknown').toLowerCase();
  switch(type) {
    case 'sun': case 'sunny': case 'clear': return 'bi-sun';
    case 'cloudy': case 'overcast': return 'bi-cloudy';
    case 'rain': case 'rainy': return 'bi-cloud-rain';
    case 'snow': case 'snowy': return 'bi-snow';
    case 'fog': case 'foggy': return 'bi-cloud-fog';
    case 'hail': return 'bi-cloud-hail';
    default: return 'bi-cloud';
  }
}

export function updateWeatherDisplay() {
  const navbarWeather = document.getElementById("navbar-weather");
  const tempElement = document.getElementById("navbar-temperature");
  const weatherElement = document.getElementById("navbar-weather-condition");
  
  if (!navbarWeather || !tempElement || !weatherElement) return;

  if (this.weather && (this.weather.currentTemperature !== undefined || this.weather.currentWeather !== undefined)) {
    const temp = this.weather.currentTemperature !== undefined ? 
      `${Math.round(this.weather.currentTemperature)}°C` : '--°C';
    tempElement.textContent = temp;

    let weatherCondition = this.weather.currentWeather || 'unknown';
    let weatherIcon = 'bi-cloud';
    
    switch(weatherCondition.toLowerCase()) {
      case 'sun': case 'sunny': case 'clear': weatherIcon = 'bi-sun'; weatherCondition = 'Sunny'; break;
      case 'cloudy': case 'overcast': weatherIcon = 'bi-cloudy'; weatherCondition = 'Cloudy'; break;
      case 'rain': case 'rainy': weatherIcon = 'bi-cloud-rain'; weatherCondition = 'Rainy'; break;
      case 'snow': case 'snowy': weatherIcon = 'bi-snow'; weatherCondition = 'Snow'; break;
      case 'fog': case 'foggy': weatherIcon = 'bi-cloud-fog'; weatherCondition = 'Foggy'; break;
      default: weatherIcon = 'bi-cloud'; weatherCondition = 'Unknown';
    }

    weatherElement.textContent = weatherCondition;
    const weatherIconElement = navbarWeather.querySelector('i.bi-cloud, i.bi-sun, i.bi-cloudy, i.bi-cloud-rain, i.bi-snow, i.bi-cloud-fog');
    if (weatherIconElement) weatherIconElement.className = `bi ${weatherIcon} ms-2 me-1`;

    navbarWeather.style.cursor = 'pointer';
    navbarWeather.onclick = () => this.showWeatherModal();
    navbarWeather.classList.remove("d-none");
  } else {
    navbarWeather.classList.add("d-none");
  }
}

export function showWeatherModal() {
  const modal = new bootstrap.Modal(document.getElementById('weatherForecastModal'));
  
  if (this.weather) {
    const modalTemp = document.getElementById('modal-temperature');
    const modalCondition = document.getElementById('modal-weather-condition');
    const modalIcon = document.getElementById('modal-weather-icon');
    const modalWindSpeed = document.getElementById('modal-wind-speed');
    const modalCloudCoverage = document.getElementById('modal-cloud-coverage');
    const modalRainLevel = document.getElementById('modal-rain-level');
    
    if (modalTemp) modalTemp.textContent = this.weather.currentTemperature !== undefined ? `${Math.round(this.weather.currentTemperature)}°C` : '--°C';
    if (modalCondition) {
      const weatherType = this.weather.currentWeather || 'unknown';
      modalCondition.textContent = weatherType.charAt(0).toUpperCase() + weatherType.slice(1);
    }
    if (modalIcon) modalIcon.innerHTML = `<i class="bi ${this.getWeatherIcon(this.weather.currentWeather || 'unknown')}"></i>`;
    if (modalWindSpeed) modalWindSpeed.textContent = Math.round(this.weather.windSpeed || 0);
    if (modalCloudCoverage) modalCloudCoverage.textContent = Math.round((this.weather.cloudCoverage || 0) * 100);
    if (modalRainLevel) modalRainLevel.textContent = Math.round((this.weather.rainLevel || 0) * 100);
    
    const forecastContainer = document.getElementById('forecast-days');
    if (forecastContainer) {
      forecastContainer.innerHTML = '';
      if (this.weather.forecast && Array.isArray(this.weather.forecast) && this.weather.forecast.length > 0) {
        this.weather.forecast.slice(0, 3).forEach((day, index) => {
          const dayLabel = index === 0 ? 'Tomorrow' : index === 1 ? 'Day After' : `Day ${index + 1}`;
          const weatherIcon = this.getWeatherIcon(day.weatherType);
          forecastContainer.innerHTML += `
            <div class="col-4">
              <div class="card bg-secondary bg-opacity-25 border-secondary">
                <div class="card-body text-center p-2">
                  <h6 class="card-title text-farm-accent">${dayLabel}</h6>
                  <div class="fs-2 mb-2"><i class="bi ${weatherIcon}"></i></div>
                  <div class="small">
                    <strong>${day.weatherType}</strong><br>
                    ${day.minTemperature}° - ${day.maxTemperature}°C
                    ${day.precipitationChance > 0 ? `<br><i class="bi bi-droplet"></i> ${day.precipitationChance}%` : ''}
                  </div>
                </div>
              </div>
            </div>`;
        });
      } else {
        forecastContainer.innerHTML = '<div class="col-12 text-center text-muted">No forecast data available</div>';
      }
    }
  }
  modal.show();
}