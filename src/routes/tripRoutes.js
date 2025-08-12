import express from 'express';
import tripController from '../controllers/tripController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import tripValidator from '../middleware/tripValidator.js';

class TripRoutes {
  constructor() {
    this.router = express.Router();
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // authenticate every /trips route
    this.router.use(authMiddleware.authenticate);
  }

  setupRoutes() {
    // Generate a new trip (AI-powered)
    // POST /api/trips/generate
    this.router.post(
      '/generate',
      tripValidator.generateTripRules,
      tripValidator.validateRequest,
      tripController.generateTrip
    );

    // Save a new trip
    // POST /api/trips
    this.router.post(
      '/',
      tripValidator.saveTripRules,
      tripValidator.validateRequest,
      tripValidator.validateTripIntegrity,
      tripController.saveTrip
    );

    // List user's trips (with pagination & filters)
    // GET /api/trips
    this.router.get(
      '/',
      tripValidator.getUserTripsRules,
      tripValidator.validateRequest,
      tripController.getUserTrips
    );

    // Get a single trip by id (and refresh its weather)
    // GET /api/trips/:id
    this.router.get(
      '/:id',
      tripValidator.tripIdRules,
      tripValidator.validateRequest,
      tripController.getTrip
    );

    // Delete a trip
    // DELETE /api/trips/:id
    this.router.delete(
      '/:id',
      tripValidator.tripIdRules,
      tripValidator.validateRequest,
      tripController.deleteTrip
    );
  }

  getRouter() {
    return this.router;
  }
}

export default new TripRoutes().getRouter();
