import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class CoordinateService {
  
  async findRoutableCoordinates(originalCoords, cityName, profile = 'foot-walking') {
    const [originalLng, originalLat] = originalCoords;
    
    const searchRadii = [0.001, 0.002, 0.005, 0.01];
    
    for (const radius of searchRadii) {
      const candidates = this.generateNearbyCoordinates(originalLat, originalLng, radius);
      
      for (const candidate of candidates) {
        try {
          const testResponse = await fetch('https://api.openrouteservice.org/v2/directions/foot-walking/geojson', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': process.env.ORS_API_KEY
            },
            body: JSON.stringify({
              coordinates: [candidate, candidate]
            })
          });
          
          if (testResponse.ok) {
            return candidate;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    return await this.geocodeCityCenter(cityName);
  }
  
  generateNearbyCoordinates(lat, lng, radius) {
    const coordinates = [];
    const steps = 8;
    
    for (let i = 0; i < steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      const newLat = lat + radius * Math.cos(angle);
      const newLng = lng + radius * Math.sin(angle);
      coordinates.push([newLng, newLat]);
    }
    
    coordinates.push([lng, lat + radius]);
    coordinates.push([lng, lat - radius]);
    coordinates.push([lng + radius, lat]);
    coordinates.push([lng - radius, lat]);
    
    return coordinates;
  }
  
  async geocodeCityCenter(cityName) {
    try {
      const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${process.env.ORS_API_KEY}&text=${encodeURIComponent(cityName)}&size=1`);
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0].geometry.coordinates;
      }
      
      throw new Error('No geocoding results');
    } catch (error) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR], 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    }
  }
  
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

export default new CoordinateService();
