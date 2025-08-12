import axios from 'axios';

class WeatherService {
  constructor() {
    this.apiKey = process.env.WEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.timeout = 10000;
  }

  validateApiKey() {
    if (!this.apiKey) {
      throw new Error('WEATHER_API_KEY is required in environment variables');
    }
  }

  async getWeatherForecast(lat, lng) {

    this.validateApiKey();
        
    const response = await axios.get(`${this.baseUrl}/forecast`, {
      params: {
        lat: lat,
        lon: lng,
        appid: this.apiKey,
        units: 'metric',
        cnt: 40 // 5 days of data (8 forecasts per day)
      },
      timeout: this.timeout
    });

    if (!response.data || !response.data.list) {
      throw new Error('Invalid weather API response structure');
    }

    // Process forecast starting from tomorrow
    const forecasts = this.processForecastForNextThreeDays(response.data.list);
    
    if (forecasts.length < 3) {
      throw new Error('Insufficient weather forecast data available');
    }
        
    return forecasts;
  }

  processForecastForNextThreeDays(forecastList) {
    // Group forecasts by date
    const dailyForecasts = new Map();
    
    forecastList.forEach(forecast => {
      const date = forecast.dt_txt.split(' ')[0]; // YYYY-MM-DD
      
      if (!dailyForecasts.has(date)) {
        dailyForecasts.set(date, []);
      }
      
      dailyForecasts.get(date).push(forecast);
    });

    // Get dates starting from tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const processedForecasts = [];
    
    // Get next 3 days starting from tomorrow
    for (let i = 0; i < 3; i++) {
      const targetDate = new Date(tomorrow);
      targetDate.setDate(tomorrow.getDate() + i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const dayData = dailyForecasts.get(dateStr);
      
      if (!dayData || dayData.length === 0) {
        throw new Error(`No weather data available for ${dateStr}`);
      }
      
      processedForecasts.push(this.aggregateDayForecast(dayData, dateStr));
    }
    
    return processedForecasts;
  }

  aggregateDayForecast(dayForecasts, dateStr) {
    // Calculate daily statistics
    const temps = dayForecasts.map(f => f.main.temp);
    const humidity = dayForecasts.map(f => f.main.humidity);
    const windSpeed = dayForecasts.map(f => f.wind.speed);
    
    // Get weather conditions frequency
    const weatherConditions = new Map();
    dayForecasts.forEach(f => {
      const condition = f.weather[0].main;
      weatherConditions.set(condition, (weatherConditions.get(condition) || 0) + 1);
    });
    
    // Find most common weather condition
    let mostCommonWeather = '';
    let maxCount = 0;
    for (const [condition, count] of weatherConditions) {
      if (count > maxCount) {
        mostCommonWeather = condition;
        maxCount = count;
      }
    }
    
    // Get details for most common weather
    const weatherDetails = dayForecasts.find(f => f.weather[0].main === mostCommonWeather).weather[0];
    
    return {
      date: this.formatDate(dateStr),
      avgTemp: Math.round(this.average(temps)),
      minTemp: Math.round(Math.min(...temps)),
      maxTemp: Math.round(Math.max(...temps)),
      avgHumidity: Math.round(this.average(humidity)),
      avgWindSpeed: Math.round(this.average(windSpeed)),
      weather: {
        main: weatherDetails.main,
        description: weatherDetails.description,
        icon: weatherDetails.icon
      }
    };
  }

  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  formatDate(dateString) {
    const date = new Date(dateString + 'T12:00:00Z');
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }

  async getWeatherForTrip(trip) {
    
    if (!trip.routes || trip.routes.length === 0) {
      throw new Error('No routes found in trip data');
    }

    // Get weather forecast for the trip starting location
    const startPoint = trip.routes[0].startPoint;
    if (!startPoint || !Number.isFinite(startPoint.lat) || !Number.isFinite(startPoint.lng)) {
      throw new Error('Invalid starting point coordinates');
    }

    // Get 3-day forecast starting tomorrow - always return all 3 days
    const forecasts = await this.getWeatherForecast(startPoint.lat, startPoint.lng);
    
    return forecasts;
  }
  
}

export default new WeatherService();