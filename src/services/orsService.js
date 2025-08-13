import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class ORSService {
  constructor() {
    this.apiKey = process.env.ORS_API_KEY;
    this.baseUrl = 'https://api.openrouteservice.org/v2/directions';
    this.geocodeUrl = 'https://api.openrouteservice.org/geocode/search';
    this.timeout = 30000;
  }

  async fetchRoute({ coordinates, profile = 'foot-walking', cityName = null }) {
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new AppError('Need at least 2 coordinates for route generation', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    console.log(`Fetching route for profile: ${profile}, coordinates: ${JSON.stringify(coordinates)}`);

    this.validateCoordinates(coordinates);
    this.validateLandCoordinates(coordinates);

    const url = `${this.baseUrl}/${profile}/geojson`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, application/geo+json',
          'Content-Type': 'application/json',
          'Authorization': this.apiKey
        },
        body: JSON.stringify({
          coordinates: coordinates,
          radiuses: Array(coordinates.length).fill(5000),
          options: {
            avoid_features: [],
            avoid_borders: 'none',
            avoid_countries: []
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`ORS API error: ${response.status} – ${errorText}`);
        }
        
        if (errorData.error?.code === 2010) {
          throw new AppError(`Could not find routable point within routing radius. Coordinates may be in water, buildings, or inaccessible terrain: ${errorData.error.message}`, 400, ERROR_CODES.VALIDATION_ERROR);
        }
        
        throw new AppError(`ORS API error: ${response.status} – ${errorData.error?.message || errorText}`, 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      }

      const data = await response.json();
      return this.processRouteResponse(data, profile);

    } catch (error) {
      if (error instanceof AppError) {
        console.error('AppError:', error.message);
        throw error;
      }
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR], 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    }
  }

  processRouteResponse(data, profile) {

    if (!data.features || !data.features.length) {
      throw new Error('No route found in ORS response');
    }

    const routeFeature = data.features[0];
    
    // Check if we got proper GeoJSON
    if (!routeFeature.geometry || !routeFeature.geometry.coordinates) {
      throw new Error('ORS returned invalid route geometry');
    }

    const properties = routeFeature.properties || {};
    const summary = properties.summary || {};
    const geometry = routeFeature.geometry;

    const result = {
      geometry: geometry,
      coordinates: geometry.coordinates,
      distance: Math.round((summary.distance || 0) / 1000 * 100) / 100, // Convert to km
      duration: Math.round((summary.duration || 0) / 60), // Convert to minutes
      profile: profile, // Include which profile was used
      summary: {
        ascent: Math.round(properties.ascent || 0),
        descent: Math.round(properties.descent || 0)
      },
      instructions: this.extractInstructions(properties.segments || [])
    };

    // Final validation
    if (!result.geometry || !result.geometry.coordinates || result.geometry.coordinates.length < 2) {
      throw new Error('Invalid route geometry after processing');
    }

    return result;
  }

  async geocode(text) {

    try {
      const response = await fetch(`${this.geocodeUrl}?api_key=${this.apiKey}&text=${encodeURIComponent(text)}&size=5`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Geocoding error: ${response.status} – ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.features || !data.features.length) {
        throw new Error(`No geocoding results found for: ${text}`);
      }

      // Find the best result - prefer results with higher confidence
      const bestResult = data.features.find(feature => 
        feature.properties?.confidence >= 0.8
      ) || data.features[0];

      const coordinates = bestResult.geometry.coordinates; // [lng, lat]
            
      return coordinates;

    } catch (error) {
      console.error('Geocoding failed:', error.message);
      throw error;
    }
  }

  /**
   * Validates if coordinates are reasonable for routing
   */
  validateCoordinates(coordinates) {
    for (const [lng, lat] of coordinates) {
      // Check if coordinates are valid numbers
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Invalid coordinate format - coordinates must be numbers');
      }
      
      // Check if coordinates are within valid bounds
      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude: ${lng} (must be between -180 and 180)`);
      }
      
      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude: ${lat} (must be between -90 and 90)`);
      }
      
      // Check for obviously invalid coordinates (0,0 is in the ocean)
      if (lat === 0 && lng === 0) {
        throw new Error('Invalid coordinates: (0,0) is in the ocean near Africa');
      }
    }
    
    return true;
  }

  /**
   * Enhanced validation to detect water coordinates
   */
  validateLandCoordinates(coordinates) {
    for (let i = 0; i < coordinates.length; i++) {
      const [lng, lat] = coordinates[i];
      
      if (!this.isLikelyOnLand(lat, lng)) {
        throw new Error(`Coordinate ${i + 1} [${lat}, ${lng}] appears to be in water. Please use coordinates on land with road/path access.`);
      }
    }
    
    return true;
  }

  /**
   * Land detection to prevent sea waypoints
   */
  isLikelyOnLand(lat, lng) {
    // Check for obviously oceanic coordinates
    if (Math.abs(lat) < 1 && Math.abs(lng) < 1) {
      return false;
    }
    
    // Pacific Ocean detection
    if (this.isInPacificOcean(lat, lng)) {
      return false;
    }    
    
    return true;
  }


  isInPacificOcean(lat, lng) {
    // Pacific Ocean rough bounds
    if (lng < -100 || lng > 120) {
      if (Math.abs(lng) > 140) { // Far from any coast
        return true;
      }
    }
    
    return false;
  }

  extractInstructions(segments) {
    const instructions = [];
    segments.forEach((segment, segmentIndex) => {
      if (segment.steps && Array.isArray(segment.steps)) {
        segment.steps.forEach((step, stepIndex) => {
          instructions.push({
            segment: segmentIndex,
            step: stepIndex,
            instruction: step.instruction || '',
            distance: Math.round((step.distance || 0) / 1000 * 100) / 100,
            duration: Math.round((step.duration || 0) / 60),
            name: step.name || ''
          });
        });
      }
    });
    return instructions;
  }
}

export default new ORSService();

