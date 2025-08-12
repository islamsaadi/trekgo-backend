import Trip from '../models/Trip.js';
import llmService from './llmService.js';
import weatherService from './weatherService.js';
import constraintService from './constraintService.js';

class TripService {
  async generateTrip(destination, tripType) {
    // Validate inputs
    if (!destination || !tripType) {
      throw new Error('Destination and tripType are required');
    }

    // Generate full trip via LLM + ORS 
    const llmTrip = await llmService.generateRoute(destination, tripType);

    // Strict validation - will throw if invalid
    if (tripType === 'trek') {
      constraintService.validateTrek(llmTrip);
    } else {
      constraintService.validateCycling(llmTrip);
    }

    // Get weather forecast for next 3 days starting tomorrow
    const routesWithWeather = await this.addWeatherToRoutes(llmTrip.routes);

    // Get the 3-day weather forecast from the weather service directly for trip-level forecast
    const firstRoute = llmTrip.routes[0];
    const { lat, lng } = firstRoute.startPoint;
    const threeDayForecast = await weatherService.getWeatherForecast(lat, lng);

    // Return with exact frontend structure
    return {
      destination: llmTrip.destination,
      city: llmTrip.city,
      tripType: llmTrip.tripType,
      totalDistance: llmTrip.totalDistance,
      estimatedDuration: llmTrip.estimatedDuration,
      estimatedDays: llmTrip.estimatedDays,
      routes: routesWithWeather,
      weatherForecast: threeDayForecast,
      highlights: llmTrip.highlights,
      difficulty: llmTrip.difficulty,
      equipment: llmTrip.equipment,
      tips: llmTrip.tips,
      countryImage: llmTrip.countryImage
    };
  }

  async addWeatherToRoutes(routes) {
    // Get weather forecast once for the starting location
    const firstRoute = routes[0];
    if (!firstRoute) {
      throw new Error('No routes provided for weather enrichment');
    }

    const { lat, lng } = firstRoute.startPoint;
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Invalid coordinates for weather: ${lat}, ${lng}`);
    }

    try {
      // Get 3-day forecast starting tomorrow
      const forecast = await weatherService.getWeatherForecast(lat, lng);
      
      // Enrich routes with weather data
      const enriched = routes.map((dayRoute, index) => {
        // Assign weather forecast for the specific day (starting tomorrow)
        const dayForecast = forecast[index] || null;
        
        return {
          ...dayRoute,
          weatherForecast: dayForecast ? [dayForecast] : []
        };
      });
      
      return enriched;

    } catch (error) {
      throw new Error(`Weather service failed: ${error.message}`);
    }
  }

  async saveTrip(userId, tripData) {
    if (!userId) throw new Error('User ID is required');
    if (!tripData.destination || !tripData.tripType || !Array.isArray(tripData.routes)) {
      throw new Error('Missing required trip data fields');
    }

    tripData.userId = userId;
    if (!tripData.name) {
      tripData.name = `${tripData.tripType} in ${tripData.destination}`;
    }

    const saved = await new Trip(tripData).save();
    return saved;
  }

  async deleteTrip(userId, id) {
    const result = await Trip.deleteOne({ _id: id, userId });
    if (!result.deletedCount) {
      throw new Error('Trip not found or not authorized');
    }
  }

  async getTripById(userId, id) {
    const trip = await Trip.findOne({ _id: id, userId });
    if (!trip) return null;
    
    // Add fresh weather data when retrieving
    try {
      const freshWeatherData = await weatherService.getWeatherForTrip(trip);
      const tripObj = trip.toObject();
      
      // Update routes with fresh weather
      tripObj.routes = tripObj.routes.map((route, index) => ({
        ...route,
        weatherForecast: freshWeatherData[index] ? [freshWeatherData[index]] : []
      }));
      
      return tripObj;
    } catch (error) {
      console.error('Weather update failed:', error);
      return trip;
    }
  }

  async getUserTrips(userId, options = {}) {
    const { skip = 0, limit = 20, sort = '-createdAt', tripType, difficulty } = options;
    
    const query = Trip.find({ userId });
    if (tripType) query.where('tripType').equals(tripType);
    if (difficulty) query.where('difficulty').equals(difficulty);
    
    const [trips, total] = await Promise.all([
      query.sort(sort).skip(skip).limit(limit),
      Trip.countDocuments({ userId })
    ]);
    
    return { trips, total };
  }
}

export default new TripService();