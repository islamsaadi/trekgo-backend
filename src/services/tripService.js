import Trip from '../models/Trip.js';
import llmService from './llmService.js';
import weatherService from './weatherService.js';
import constraintService from './constraintService.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class TripService {
  async generateTrip(destination, tripType) {
    if (!destination || !tripType) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR], 400, ERROR_CODES.VALIDATION_ERROR);
    }

    try {
      const llmTrip = await llmService.generateRoute(destination, tripType);

      if (tripType === 'trek') {
        constraintService.validateTrek(llmTrip);
      } else {
        constraintService.validateCycling(llmTrip);
      }

      const routesWithWeather = await this.addWeatherToRoutes(llmTrip.routes);

      const firstRoute = llmTrip.routes[0];
      const { lat, lng } = firstRoute.startPoint;
      const threeDayForecast = await weatherService.getWeatherForecast(lat, lng);

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
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.TRIP_GENERATION_FAILED], 500, ERROR_CODES.TRIP_GENERATION_FAILED);
    }
  }

  async addWeatherToRoutes(routes) {
    const firstRoute = routes[0];
    if (!firstRoute) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR], 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const { lat, lng } = firstRoute.startPoint;
    
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR], 400, ERROR_CODES.VALIDATION_ERROR);
    }

    try {
      const forecast = await weatherService.getWeatherForecast(lat, lng);
      
      const enriched = routes.map((dayRoute, index) => {
        const dayForecast = forecast[index] || null;
        
        return {
          ...dayRoute,
          weatherForecast: dayForecast ? [dayForecast] : []
        };
      });
      
      return enriched;

    } catch (error) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR], 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    }
  }

  async saveTrip(userId, tripData) {
    if (!userId) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR], 400, ERROR_CODES.VALIDATION_ERROR);
    }
    if (!tripData.destination || !tripData.tripType || !Array.isArray(tripData.routes)) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR], 400, ERROR_CODES.VALIDATION_ERROR);
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
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.TRIP_NOT_FOUND], 404, ERROR_CODES.TRIP_NOT_FOUND);
    }
  }

  async getTripById(userId, id) {
    const trip = await Trip.findOne({ _id: id, userId });
    if (!trip) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.TRIP_NOT_FOUND], 404, ERROR_CODES.TRIP_NOT_FOUND);
    }
    
    try {
      const freshWeatherData = await weatherService.getWeatherForTrip(trip);
      const tripObj = trip.toObject();
      
      tripObj.routes = tripObj.routes.map((route, index) => ({
        ...route,
        weatherForecast: freshWeatherData[index] ? [freshWeatherData[index]] : []
      }));
      
      return tripObj;
    } catch (error) {
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