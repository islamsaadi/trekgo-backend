import groqService from './groqService.js';
import orsService from './orsService.js';
import imageService from './imageService.js';
import constraintService from './constraintService.js';
import coordinateService from './coordinateService.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class LLMService {

  async generateRoute(destination, tripType) {

    // Step 1: Generate route structure from LLM (includes city determination)
    const llmRouteData = await groqService.generateRoutePoints(destination, tripType);
    const specificCity = llmRouteData.city;
    console.log(`LLM determined city: ${specificCity} for destination: ${destination}`);
    
    if (!specificCity) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.CITY_NOT_FOUND], 404, ERROR_CODES.CITY_NOT_FOUND);
    }

    // Validate trip type
    if (!['trek', 'cycling'].includes(tripType)) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_TRIP_TYPE], 400, ERROR_CODES.INVALID_TRIP_TYPE);
    }

    // Step 2: Build real routes using ORS for each day
    const routes = await this.buildRealRoutes(llmRouteData.routes, tripType, specificCity);

    // Step 3: Apply trip type specific constraints
    let validatedRoutes = routes;
    if (tripType === 'trek') {
      validatedRoutes = await this.processTrekRoutes(routes, llmRouteData);
    } else {
      validatedRoutes = await this.processCyclingRoutes(routes);
    }

    // Step 4: Calculate totals
    const totalDistance = validatedRoutes.reduce((sum, r) => sum + r.distance, 0);
    const totalDuration = validatedRoutes.reduce((sum, r) => sum + r.duration, 0);

    // Step 5: Get destination image
    const countryImage = await imageService.getDestinationImage(destination);

    // Step 6: Build final response
    const result = {
      destination,
      city: specificCity,
      tripType: llmRouteData.tripType,
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedDuration: totalDuration,
      estimatedDays: llmRouteData.estimatedDays,
      routes: validatedRoutes,
      highlights: llmRouteData.highlights,
      difficulty: this.calculateDifficulty(totalDistance, llmRouteData.estimatedDays, tripType),
      equipment: llmRouteData.equipment,
      tips: llmRouteData.tips,
      countryImage
    };

    // Step 8: Final validation
    this.validateFinalTrip(result);

    return result;
  }

  async buildRealRoutes(llmRoutes, tripType, cityName) {
    const routes = [];
    
    for (const routeData of llmRoutes) {
      if (!routeData.startPoint || !routeData.endPoint) {
        throw new AppError(`Day ${routeData.day}: Missing start or end point`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      let coordinates = [
        [routeData.startPoint.lng, routeData.startPoint.lat],
        ...(routeData.waypoints || []).map(w => [w.lng, w.lat]),
        [routeData.endPoint.lng, routeData.endPoint.lat]
      ];

      const profile = tripType === 'trek' ? 'foot-walking' : 'cycling-regular';
      
      try {
        const orsRoute = await orsService.fetchRoute({
          coordinates,
          profile,
          cityName
        });

        routes.push({
          day: routeData.day,
          distance: orsRoute.distance,
          duration: orsRoute.duration,
          startPoint: routeData.startPoint,
          endPoint: routeData.endPoint,
          waypoints: routeData.waypoints || [],
          coordinates: orsRoute.coordinates,
          geometry: orsRoute.geometry,
          description: routeData.description,
          elevation: orsRoute.summary,
          instructions: orsRoute.instructions || []
        });

      } catch (error) {
        console.error(`Error processing route for day ${routeData.day}:`, error);
        if (error.message.includes('routable point')) {
          
          const fixedCoordinates = await this.fixNonRoutableCoordinates(coordinates, cityName, profile);
          
          try {
            const orsRoute = await orsService.fetchRoute({
              coordinates: fixedCoordinates,
              profile,
              cityName
            });

            const [startLng, startLat] = fixedCoordinates[0];
            const [endLng, endLat] = fixedCoordinates[fixedCoordinates.length - 1];

            routes.push({
              day: routeData.day,
              distance: orsRoute.distance,
              duration: orsRoute.duration,
              startPoint: { lat: startLat, lng: startLng, name: routeData.startPoint.name },
              endPoint: { lat: endLat, lng: endLng, name: routeData.endPoint.name },
              waypoints: fixedCoordinates.slice(1, -1).map((coord, i) => ({
                lat: coord[1],
                lng: coord[0],
                name: (routeData.waypoints && routeData.waypoints[i] && routeData.waypoints[i].name) || `Waypoint ${i + 1}`
              })),
              coordinates: orsRoute.coordinates,
              geometry: orsRoute.geometry,
              description: routeData.description,
              elevation: orsRoute.summary,
              instructions: orsRoute.instructions || []
            });
          } catch (retryError) {
            throw new AppError(ERROR_MESSAGES[ERROR_CODES.TRIP_GENERATION_FAILED], 500, ERROR_CODES.TRIP_GENERATION_FAILED);
          }

        } else {
          throw error;
        }
      }
    }

    return routes;
  }

  async fixNonRoutableCoordinates(coordinates, cityName, profile) {
    const fixedCoordinates = [];
    
    for (const coord of coordinates) {
      try {
        const routableCoord = await coordinateService.findRoutableCoordinates(coord, cityName, profile);
        fixedCoordinates.push(routableCoord);
      } catch (error) {
        const cityCenter = await coordinateService.geocodeCityCenter(cityName);
        fixedCoordinates.push(cityCenter);
      }
    }
    
    return fixedCoordinates;
  }

  async processTrekRoutes(routes, llmRouteData) {
    // Trek: Overall trip is circular, individual days are continuous
    let processedRoutes = [...routes];
    
    // First, check and adjust routes that are out of bounds
    for (let i = 0; i < processedRoutes.length; i++) {
      const route = processedRoutes[i];
      
      if (route.distance > 15) {
        
        // For routes that are too long, we'll keep only the first few waypoints
        const waypoints = route.waypoints || [];
        const reducedWaypoints = waypoints.length > 2 ? waypoints.slice(0, 2) : waypoints.slice(0, 1);
        
        // If this is not the last day, route to the next day's start
        let endPoint = route.endPoint;
        if (i < processedRoutes.length - 1) {
          endPoint = processedRoutes[i + 1].startPoint;
        }
        
        const shorterCoords = [
          [route.startPoint.lng, route.startPoint.lat],
          ...reducedWaypoints.map(w => [w.lng, w.lat]),
          [endPoint.lng, endPoint.lat]
        ];
        
        const shorterOrs = await orsService.fetchRoute({
          coordinates: shorterCoords,
          profile: 'foot-walking',
          cityName: llmRouteData.city
        });
        
        processedRoutes[i] = {
          ...route,
          waypoints: reducedWaypoints,
          distance: shorterOrs.distance,
          duration: shorterOrs.duration,
          coordinates: shorterOrs.coordinates,
          geometry: shorterOrs.geometry,
          elevation: shorterOrs.summary,
          instructions: shorterOrs.instructions
        };
                
        // If still too long, remove all waypoints
        if (shorterOrs.distance > 15) {
          
          const directCoords = [
            [route.startPoint.lng, route.startPoint.lat],
            [endPoint.lng, endPoint.lat]
          ];
          
          const directOrs = await orsService.fetchRoute({
            coordinates: directCoords,
            profile: 'foot-walking',
            cityName: llmRouteData.city
          });
          
          processedRoutes[i] = {
            ...route,
            waypoints: [],
            distance: directOrs.distance,
            duration: directOrs.duration,
            coordinates: directOrs.coordinates,
            geometry: directOrs.geometry,
            elevation: directOrs.summary,
            instructions: directOrs.instructions
          };
        }
      }
    }
    
    // Ensure continuous path
    for (let i = 0; i < processedRoutes.length - 1; i++) {
      const currentDayEnd = processedRoutes[i].endPoint;
      const nextDayStart = processedRoutes[i + 1].startPoint;
      
      if (!this.isSamePoint(currentDayEnd, nextDayStart)) {
        processedRoutes[i + 1].startPoint = { ...currentDayEnd };
      }
    }

    // Ensure overall circular (first day start = last day end)
    const firstDayStart = processedRoutes[0].startPoint;
    const lastDayEnd = processedRoutes[processedRoutes.length - 1].endPoint;
    
    if (!this.isSamePoint(firstDayStart, lastDayEnd)) {

      const lastRoute = processedRoutes[processedRoutes.length - 1];
      const lastWaypoints = lastRoute.waypoints || [];
      
      // Route from last waypoint (or start if no waypoints) back to overall start
      const returnCoords = lastWaypoints.length > 0 
        ? [
            [lastWaypoints[lastWaypoints.length - 1].lng, lastWaypoints[lastWaypoints.length - 1].lat],
            [firstDayStart.lng, firstDayStart.lat]
          ]
        : [
            [lastRoute.startPoint.lng, lastRoute.startPoint.lat],
            [firstDayStart.lng, firstDayStart.lat]
          ];
      
      const returnOrs = await orsService.fetchRoute({
        coordinates: returnCoords,
        profile: 'foot-walking',
        cityName: llmRouteData.city
      });
      
      processedRoutes[processedRoutes.length - 1] = {
        ...lastRoute,
        endPoint: { ...firstDayStart },
        distance: returnOrs.distance,
        duration: returnOrs.duration,
        coordinates: returnOrs.coordinates,
        geometry: returnOrs.geometry,
        elevation: returnOrs.summary,
        instructions: returnOrs.instructions
      };
    }

    return processedRoutes;
  }

  async processCyclingRoutes(routes) {
    // Cycling requirements: exactly 2 days, 10-60km per day, point-to-point
    if (routes.length !== 2) {
      throw new Error('Cycling trip must have exactly 2 days');
    }

    // Validate each day's distance
    for (const route of routes) {
      if (route.distance < 10 || route.distance > 60) {
        throw new Error(`Day ${route.day}: Distance ${route.distance}km is outside 10-60km range`);
      }
    }

    // Verify point-to-point (overall start != final end)
    if (this.isSamePoint(routes[0].startPoint, routes[1].endPoint)) {
      throw new Error('Cycling trip must be point-to-point overall');
    }

    // Ensure day 1 end = day 2 start
    if (!this.isSamePoint(routes[0].endPoint, routes[1].startPoint)) {
      console.warn('Day 1 end doesn\'t match Day 2 start. Routes may not be continuous.');
    }

    return routes;
  }

  isSamePoint(a, b) {
    const tolerance = 0.001; // ~100m
    return Math.abs(a.lat - b.lat) < tolerance && 
           Math.abs(a.lng - b.lng) < tolerance;
  }

  calculateDifficulty(totalDistance, days, tripType) {
    const avgPerDay = totalDistance / days;
    
    if (tripType === 'trek') {
      if (avgPerDay <= 8) return 'easy';
      if (avgPerDay <= 12) return 'moderate';
      return 'hard';
    } else {
      if (avgPerDay <= 30) return 'easy';
      if (avgPerDay <= 50) return 'moderate';
      return 'hard';
    }
  }

  validateFinalTrip(trip) {
    // Validate structure
    if (!trip.routes || !Array.isArray(trip.routes)) {
      throw new Error('Invalid trip: missing routes');
    }

    // Validate each route has required fields
    for (const route of trip.routes) {
      if (!route.geometry || !route.coordinates) {
        throw new Error(`Day ${route.day}: Missing geometry data`);
      }
      if (!route.startPoint || !route.endPoint) {
        throw new Error(`Day ${route.day}: Missing start/end points`);
      }
    }

    // Use constraint service for trip-type specific validation
    if (trip.tripType === 'trek') {
      constraintService.validateTrek(trip);
    } else {
      constraintService.validateCycling(trip);
    }
  }
}

export default new LLMService();