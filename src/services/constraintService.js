class ConstraintService {
  constructor() {
    this.POINT_TOLERANCE = 0.001; // ~100m tolerance for same point
  }

  isSamePoint(a, b) {
    if (!a || !b) return false;
    const latDiff = Math.abs(a.lat - b.lat);
    const lngDiff = Math.abs(a.lng - b.lng);
    return latDiff < this.POINT_TOLERANCE && lngDiff < this.POINT_TOLERANCE;
  }

  validateTrek(trip) {
    // Trek: 1-5 days total, each day 5-15km, overall trip circular (not each day)
    const { estimatedDays, routes, tripType } = trip;

    if (tripType !== 'trek') {
      throw new Error(`Expected trek trip type, got ${tripType}`);
    }

    if (!estimatedDays || estimatedDays < 1 || estimatedDays > 5) {
      throw new Error(`Trek must be 1-5 days, got ${estimatedDays}`);
    }

    if (!Array.isArray(routes) || routes.length !== estimatedDays) {
      throw new Error(`Expected ${estimatedDays} routes, got ${routes?.length}`);
    }

    // Validate each day - with some tolerance for distance
    routes.forEach((route) => {
      // Hard limits - absolutely cannot exceed
      if (route.distance < 5) {
        throw new Error(`Day ${route.day}: Distance ${route.distance}km is too short (minimum 5km)`);
      }
      if (route.distance > 15) {
        throw new Error(`Day ${route.day}: Distance ${route.distance}km is too long (maximum 15km)`);
      }

      // Validate required fields
      this.validateRouteStructure(route);
    });

    // Validate continuous path (each day ends where next begins)
    for (let i = 0; i < routes.length - 1; i++) {
      if (!this.isSamePoint(routes[i].endPoint, routes[i + 1].startPoint)) {
        console.warn(`Trek continuity issue: Day ${i + 1} end doesn't perfectly match Day ${i + 2} start`);
      }
    }

    // Validate overall circular (first day start = last day end)
    const overallStart = routes[0].startPoint;
    const overallEnd = routes[routes.length - 1].endPoint;
    
    if (!this.isSamePoint(overallStart, overallEnd)) {
      console.warn('Trek is not perfectly circular overall, but this may be adjusted');
    }
  }

  validateCycling(trip) {
    // Cycling: exactly 2 days, each day 0.01-60km, point-to-point overall
    const { estimatedDays, routes, tripType } = trip;

    if (tripType !== 'cycling') {
      throw new Error(`Expected cycling trip type, got ${tripType}`);
    }

    if (estimatedDays !== 2) {
      throw new Error(`Cycling must be exactly 2 days, got ${estimatedDays}`);
    }

    if (!Array.isArray(routes) || routes.length !== 2) {
      throw new Error(`Cycling must have exactly 2 routes, got ${routes?.length}`);
    }

    // Validate each day
    routes.forEach((route) => {
      // Distance validation
      if (route.distance < 0.01) {
        throw new Error(`Day ${route.day}: Distance ${route.distance}km is below 0.01km minimum`);
      }
      if (route.distance > 60) {
        throw new Error(`Day ${route.day}: Distance ${route.distance}km exceeds 60km maximum`);
      }

      // Validate required fields
      this.validateRouteStructure(route);
    });

    // Validate continuous (day 1 end = day 2 start)
    if (!this.isSamePoint(routes[0].endPoint, routes[1].startPoint)) {
      throw new Error('Cycling days must be continuous: Day 1 end must equal Day 2 start');
    }

    // Point-to-point validation (overall start != final end)
    const overallStart = routes[0].startPoint;
    const overallEnd = routes[1].endPoint;
    
    if (this.isSamePoint(overallStart, overallEnd)) {
      throw new Error('Cycling trip must be point-to-point (day 1 start must not equal day 2 end)');
    }
  }

  validateRouteStructure(route) {
    // Validate day number
    if (!Number.isInteger(route.day) || route.day < 1) {
      throw new Error('Invalid day number in route');
    }

    // Validate distance
    if (!Number.isFinite(route.distance) || route.distance < 0) {
      throw new Error(`Day ${route.day}: Invalid distance`);
    }

    // Validate duration
    if (!Number.isFinite(route.duration) || route.duration < 0) {
      throw new Error(`Day ${route.day}: Invalid duration`);
    }

    // Validate points
    this.validatePoint(route.startPoint, `Day ${route.day} start point`);
    this.validatePoint(route.endPoint, `Day ${route.day} end point`);

    // Validate waypoints if present
    if (route.waypoints && !Array.isArray(route.waypoints)) {
      throw new Error(`Day ${route.day}: Waypoints must be an array`);
    }

    if (route.waypoints) {
      route.waypoints.forEach((wp, index) => {
        this.validatePoint(wp, `Day ${route.day} waypoint ${index + 1}`);
      });
    }

    // Validate geometry
    if (!route.geometry || !route.geometry.coordinates) {
      throw new Error(`Day ${route.day}: Missing route geometry`);
    }

    if (!Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) {
      throw new Error(`Day ${route.day}: Invalid geometry coordinates`);
    }

    // Validate coordinates array
    if (!route.coordinates || !Array.isArray(route.coordinates)) {
      throw new Error(`Day ${route.day}: Missing coordinates array`);
    }
  }

  validatePoint(point, context) {
    if (!point || typeof point !== 'object') {
      throw new Error(`${context}: Invalid point object`);
    }

    if (!Number.isFinite(point.lat) || point.lat < -90 || point.lat > 90) {
      throw new Error(`${context}: Invalid latitude ${point.lat}`);
    }

    if (!Number.isFinite(point.lng) || point.lng < -180 || point.lng > 180) {
      throw new Error(`${context}: Invalid longitude ${point.lng}`);
    }

    if (!point.name || typeof point.name !== 'string') {
      throw new Error(`${context}: Missing or invalid point name`);
    }
  }

  // Additional validation for complete trip
  validateCompleteTrip(trip) {
    // Validate basic structure
    if (!trip.destination || typeof trip.destination !== 'string') {
      throw new Error('Invalid or missing destination');
    }

    if (!trip.city || typeof trip.city !== 'string') {
      throw new Error('Invalid or missing city');
    }

    if (!trip.tripType || !['trek', 'cycling'].includes(trip.tripType)) {
      throw new Error('Invalid trip type');
    }

    if (!Number.isFinite(trip.totalDistance) || trip.totalDistance <= 0) {
      throw new Error('Invalid total distance');
    }

    if (!Number.isFinite(trip.estimatedDuration) || trip.estimatedDuration <= 0) {
      throw new Error('Invalid estimated duration');
    }

    if (!['easy', 'moderate', 'hard'].includes(trip.difficulty)) {
      throw new Error('Invalid difficulty level');
    }

    if (!trip.countryImage || typeof trip.countryImage !== 'string') {
      throw new Error('Missing country image');
    }

    // Validate arrays
    ['highlights', 'equipment', 'tips'].forEach(field => {
      if (!Array.isArray(trip[field])) {
        throw new Error(`${field} must be an array`);
      }
    });

    // Call trip-type specific validation
    if (trip.tripType === 'trek') {
      this.validateTrek(trip);
    } else {
      this.validateCycling(trip);
    }
  }
}

export default new ConstraintService();