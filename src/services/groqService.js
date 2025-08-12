import Groq from 'groq-sdk';

class GroqService {
  constructor() {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is required');
    }
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
  }

  async generateRoutePoints(destination, tripType) {
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const prompt = this.buildRoutePrompt(destination, tripType);
        const jsonResponse = await this.callLLMForJSON(prompt, attempt > 1);
        const parsed = this.parseAndValidateJSON(jsonResponse, tripType);
        return parsed;
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        if (attempt === maxAttempts) {
          throw new Error(`Failed to generate valid route after ${maxAttempts} attempts: ${lastError.message}`);
        }
      }
    }
  }

  buildRoutePrompt(destination, tripType) {
    const basePrompt = `Generate a ${tripType} route plan for "${destination}".

First, determine the specific city and country for this destination = ${destination}.
Then create routes starting from coordinates the center of this destination = ${destination}.
NEVER make route shorter than 5 km - MUST.
NEVER make route longer than 15 km - MUST.
CHECK your output that every route is more than 5 km, if it is less than 5 km, make it longer or find a new route.
CHECK your output that every route is less than 15 km, if it is more than 15 km, make it shorter or find a new route.
MUST use coordinates on land with road/path access.
MUST find routes that are realistic and safe for the specified trip type.
coordinates should be in the format [lng, lat], 6 decimal places for precision.
Each route must have a start point, end point, and optional waypoints.
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
        console.error('Empty response from GROQ API');
        throw new Error('No response from LLM');
      }

      console.log(`LLM Response length: ${response.length} characters`);
      
      return response;
    } catch (error) {
      console.error('GROQ API call failed:', error);
      throw error;
    }
  }

  parseAndValidateJSON(jsonString, expectedTripType) {
    // Extract JSON from response
    const cleanedJSON = this.extractJSON(jsonString);
    
    let parsed;
    try {
      parsed = JSON.parse(cleanedJSON);
    } catch (error) {
      throw new Error(`Invalid JSON format: ${error.message}`);
    }

    // Validate city
    if (!parsed.city || typeof parsed.city !== 'string' || !parsed.city.includes(',')) {
      throw new Error('Invalid or missing city in format "City, Country"');
    }

    // Validate structure
    if (!parsed.tripType || parsed.tripType !== expectedTripType) {
      throw new Error(`Invalid tripType: expected ${expectedTripType}, got ${parsed.tripType}`);
    }

    if (!Number.isInteger(parsed.estimatedDays) || parsed.estimatedDays < 1) {
      throw new Error('Invalid estimatedDays');
    }

    if (!Array.isArray(parsed.routes) || parsed.routes.length !== parsed.estimatedDays) {
      throw new Error(`Routes array must have ${parsed.estimatedDays} elements`);
    }

    // Validate trip type specific constraints
    if (expectedTripType === 'trek') {
      if (parsed.estimatedDays < 1 || parsed.estimatedDays > 5) {
        throw new Error('Trek must be 1-5 days');
      }
      
      // Validate overall circular for trek
      const firstDay = parsed.routes[0];
      const lastDay = parsed.routes[parsed.routes.length - 1];
      if (!firstDay.startPoint || !lastDay.endPoint) {
        throw new Error('Missing start/end points for trek validation');
      }
    } else if (expectedTripType === 'cycling') {
      if (parsed.estimatedDays !== 2) {
        throw new Error('Cycling must be exactly 2 days');
      }
    }

    // Validate and normalize routes
    const routes = parsed.routes.map((route, index) => {
      if (!route.startPoint || !route.endPoint) {
        throw new Error(`Route day ${index + 1} missing start/end point`);
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
      throw new Error('Invalid point object');
    }

    const lat = Number(point.lat);
    const lng = Number(point.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error(`Invalid latitude: ${point.lat}`);
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error(`Invalid longitude: ${point.lng}`);
    }

    return {
      lat,
      lng,
      name: String(point.name || '')
    };
  }

  extractJSON(text) {
    // Remove markdown code blocks if present
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    
    // Find first { and last }
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No valid JSON object found in response');
    }
    
    return cleaned.slice(start, end + 1);
  }
}

export default new GroqService();