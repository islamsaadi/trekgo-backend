import tripService from '../services/tripService.js';
import weatherService from '../services/weatherService.js';

class TripController {
  async generateTrip(req, res, next) {
    try {
      const { destination, tripType } = req.body;
      if (!destination || !tripType) return res.status(400).json({ success: false, error: 'Destination and tripType are required' });
      const trip = await tripService.generateTrip(destination, tripType);
      res.json({ success: true, data: trip });
    } catch (e) { next(e); }
  }

  async saveTrip(req, res, next) {
    try {
      const userId = req.user.id;
      const saved = await tripService.saveTrip(userId, req.body);
      res.status(201).json({ success: true, data: saved });
    } catch (e) { next(e); }
  }

  async deleteTrip(req, res, next) {
    try {
      await tripService.deleteTrip(req.user.id, req.params.id);
      res.json({ success: true, data: { id: req.params.id } });
    } catch (e) { next(e); }
  }

  async getTrip(req, res, next) {
    try {
      const trip = await tripService.getTripById(req.user.id, req.params.id);
      if (!trip) return res.status(404).json({ success: false, error: 'Trip not found' });
      // Attach fresh 3-day forecast at view time (tomorrow onward)
      const fresh = await weatherService.getWeatherForTrip(trip);
      trip.weatherForecast = fresh;
      res.json({ success: true, data: trip });
    } catch (e) { next(e); }
  }

  async getUserTrips(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, sort, tripType, difficulty } = req.query;
      const options = { skip: (page - 1) * limit, limit: +limit, sort: sort || '-createdAt', tripType, difficulty };

      const { trips, total } = await tripService.getUserTrips(userId, options);

      // Enrich each trip with fresh weather data
      const enrichedTrips = await Promise.all(trips.map(async (trip) => {
        if (!trip.routes || trip.routes.length === 0) {
          return trip.toObject?.() ?? trip;
        }

        // Get 3-day forecast for the trip starting location
        const firstRoute = trip.routes[0];
        const { lat, lng } = firstRoute.startPoint;
        const threeDayForecast = await weatherService.getWeatherForecast(lat, lng);

        // Enrich routes with day-specific weather
        const enrichedRoutes = trip.routes.map((route, index) => {
          const dayForecast = threeDayForecast[index] || null;
          return { 
            ...route.toObject?.() ?? route, 
            weatherForecast: dayForecast ? [dayForecast] : []
          };
        });

        const tripObj = trip.toObject?.() ?? trip;
        tripObj.routes = enrichedRoutes;
        tripObj.weatherForecast = threeDayForecast;
        return tripObj;
      }));

      res.json({ success: true, data: { trips: enrichedTrips, pagination: { page: +page, limit: +limit, total } } });
    } catch (e) { next(e); }
  }
}

export default new TripController();
