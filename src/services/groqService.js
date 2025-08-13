import Groq from 'groq-sdk';
import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class GroqService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new AppError('GROQ_API_KEY is required', 500, ERROR_CODES.SERVER_ERROR);
    }
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  async generateRoutePoints(destination, tripType) {
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const prompt = this.buildRoutePrompt(destination, tripType, attempt > 1 ? lastError : null);
        const jsonResponse = await this.callLLMForJSON(prompt, attempt > 1);
        const parsed = this.parseAndValidateJSON(jsonResponse, tripType);
        return parsed;
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) {
          throw new AppError(
            `Failed to generate valid route after ${maxAttempts} attempts: ${lastError.message}`, 
            500, 
            ERROR_CODES.TRIP_GENERATION_FAILED
          );
        }
      }
    }
  }

  buildRoutePrompt(destination, tripType, previousError = null) {
    let errorGuidance = '';
    if (previousError && previousError.includes('routable point')) {
      errorGuidance = `
        CRITICAL ROUTING REQUIREMENTS - Previous attempt failed due to non-routable coordinates:
        - ONLY use coordinates that are in the city
        - ONLY use coordinates that are ON roads, trails, paths, or streets
        - AVOID coordinates in: water bodies, buildings, private property, mountains peaks without trails
        - For cities: use coordinates near main streets, public squares, train stations, bus stops
        - For nature areas: use coordinates at trailheads, parking areas, official trail markers
        - For hiking: use established trail coordinates, not random mountain coordinates
        - For cycling: use bike paths, roads, or designated cycling routes
        - Coordinates must be accessible by foot/bike from nearby roads or paths
        - Test each coordinate: could someone actually walk/bike TO this exact spot?`;
    }

    const basePrompt = `Generate a ${tripType} route plan for "${destination}".

${errorGuidance}

First, determine the specific city and country for this destination = ${destination}.
Then create routes starting from coordinates the center of this destination = ${destination}.
NEVER make route shorter than 5 km - MUST.
NEVER make route longer than 15 km - MUST.
CHECK your output that every route is more than 5 km, if it is less than 5 km, make it longer or find a new route.
CHECK your output that every route is less than 15 km, if it is more than 15 km, make it shorter or find a new route.
- ONLY use coordinates that are in the city
        - ONLY use coordinates that are ON roads, trails, paths, or streets
        - AVOID coordinates in: water bodies, buildings, private property, mountains peaks without trails
MUST find routes that are realistic and safe for the specified trip type.
coordinates should be in the format [lng, lat], 6 decimal places for precision.
Each route must have a start point, end point, and optional waypoints.

ROUTING SAFETY REQUIREMENTS:
- Use coordinates that are on established roads, paths, or trails
- For urban areas: use street intersections, public spaces, transport hubs
- For natural areas: use official trailheads, visitor centers, designated trail points
- Ensure all coordinates are accessible on foot or by bike
- Avoid water bodies, private property, cliff edges, or inaccessible terrain

Return the full trip in valid JSON format with the following structure:
Output ONLY valid JSON matching this exact schema with no additional text:
{
  "city": "City, Country",
  "tripType": "${tripType}",
  "estimatedDays": number,
  "routes": [
    {
      "day": number,
      "startPoint": {"lat": number, "lng": number, "name": string},
      "waypoints": [{"lat": number, "lng": number, "name": string}],
      "endPoint": {"lat": number, "lng": number, "name": string},
      "description": string
    }
  ],
  "highlights": [string],
  "equipment": [string],
  "tips": [string]
}`;

    if (tripType === 'trek') {
      return `${basePrompt}

TREK REQUIREMENTS:
- Total trip: 2-5 days
- Each day: 5-15km walking distance (aim for 8-12km)
- OVERALL trip is circular (day 1 start = final day end), but individual days are NOT circular
- Each day ends where the next day starts (continuous path)
- Keep routes within 20km radius to avoid excessive distances
- Use real hiking trails, parks, and walking paths
- 2-3 waypoints per day maximum to keep distances manageable
- Different route each day
- IMPORTANT: Waypoints should be relatively close to avoid long distances`;
    } else {
      return `${basePrompt}

CYCLING REQUIREMENTS:
- Exactly 2 consecutive days
- Each day: 10-60km cycling distance
- Point-to-point journey (day 1 start != day 2 end)
- Day 1 ends where day 2 starts
- Use real cycling paths and roads
- 2-4 waypoints per day
- Progressive route from city to city`;
    }
  }

  async callLLMForJSON(prompt, isRetry = false) {
    const systemPrompt = isRetry 
      ? 'You MUST return ONLY valid JSON. No markdown, no backticks, no explanations. Start with { and end with }.'
      : 'Return ONLY valid JSON matching the specified schema. No additional text.';

    try {
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      const response = completion.choices?.[0]?.message?.content;
      
      if (!response) {
        throw new AppError(ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR], 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.EXTERNAL_SERVICE_ERROR], 503, ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    }
  }

  parseAndValidateJSON(jsonString, expectedTripType) {
    const cleanedJSON = this.extractJSON(jsonString);
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedJSON);
    } catch (error) {
      throw new AppError(`Invalid JSON format: ${error.message}`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!parsed.city || typeof parsed.city !== 'string' || !parsed.city.includes(',')) {
      throw new AppError('Invalid or missing city in format "City, Country"', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!parsed.tripType || parsed.tripType !== expectedTripType) {
      throw new AppError(`Invalid tripType: expected ${expectedTripType}, got ${parsed.tripType}`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!Number.isInteger(parsed.estimatedDays) || parsed.estimatedDays < 1) {
      throw new AppError('Invalid estimatedDays', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!Array.isArray(parsed.routes) || parsed.routes.length !== parsed.estimatedDays) {
      throw new AppError(`Routes array must have ${parsed.estimatedDays} elements`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (expectedTripType === 'trek') {
      if (parsed.estimatedDays < 1 || parsed.estimatedDays > 5) {
        throw new AppError('Trek must be 1-5 days', 400, ERROR_CODES.VALIDATION_ERROR);
      }
      
      const firstDay = parsed.routes[0];
      const lastDay = parsed.routes[parsed.routes.length - 1];
      if (!firstDay.startPoint || !lastDay.endPoint) {
        throw new AppError('Missing start/end points for trek validation', 400, ERROR_CODES.VALIDATION_ERROR);
      }
    } else if (expectedTripType === 'cycling') {
      if (parsed.estimatedDays !== 2) {
        throw new AppError('Cycling must be exactly 2 days', 400, ERROR_CODES.VALIDATION_ERROR);
      }
    }

    const routes = parsed.routes.map((route, index) => {
      if (!route.startPoint || !route.endPoint) {
        throw new AppError(`Route day ${index + 1} missing start/end point`, 400, ERROR_CODES.VALIDATION_ERROR);
      }

      return {
        day: route.day || index + 1,
        startPoint: this.validatePoint(route.startPoint),
        endPoint: this.validatePoint(route.endPoint),
        waypoints: (route.waypoints || []).map(w => this.validatePoint(w)),
        description: route.description || ''
      };
    });

    return {
      city: parsed.city,
      tripType: parsed.tripType,
      estimatedDays: parsed.estimatedDays,
      routes,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
      equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : []
    };
  }

  validatePoint(point) {
    if (!point || typeof point !== 'object') {
      throw new AppError('Invalid point object', 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const lat = Number(point.lat);
    const lng = Number(point.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new AppError(`Invalid latitude: ${point.lat}`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new AppError(`Invalid longitude: ${point.lng}`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    return {
      lat,
      lng,
      name: String(point.name || '')
    };
  }

  extractJSON(text) {
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start === -1 || end === -1 || end <= start) {
      throw new AppError('No valid JSON object found in response', 400, ERROR_CODES.VALIDATION_ERROR);
    }
    
    return cleaned.slice(start, end + 1);
  }
}

export default new GroqService();