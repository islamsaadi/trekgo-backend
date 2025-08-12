import { body, param, validationResult } from 'express-validator';

class TripValidator {

  // Generate trip validation rules
  generateTripRules = [
    body('destination')
      .notEmpty()
      .withMessage('Destination is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Destination must be between 2 and 100 characters')
      .trim(),
    
    body('tripType')
      .notEmpty()
      .withMessage('Trip type is required')
      .isIn(['trek', 'cycling'])
      .withMessage('Trip type must be either "trek" or "cycling"')
      .toLowerCase()
  ];

  // Save trip validation rules
  saveTripRules = [
    body('name')
      .notEmpty()
      .withMessage('Trip name is required')
      .isLength({ min: 3, max: 100 })
      .withMessage('Trip name must be between 3 and 100 characters')
      .trim(),
    
    body('description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
      .trim(),
    
    body('destination')
      .notEmpty()
      .withMessage('Destination is required')
      .trim(),
    
    body('tripType')
      .notEmpty()
      .withMessage('Trip type is required')
      .isIn(['trek', 'cycling'])
      .withMessage('Trip type must be either "trek" or "cycling"'),
    
    body('totalDistance')
      .isFloat({ min: 0 })
      .withMessage('Total distance must be a positive number'),
    
    body('estimatedDuration')
      .isFloat({ min: 0 })
      .withMessage('Estimated duration must be a positive number'),
    
    body('estimatedDays')
      .isInt({ min: 1 })
      .withMessage('Estimated days must be at least 1'),
    
    body('difficulty')
      .optional()
      .isIn(['easy', 'moderate', 'hard'])
      .withMessage('Difficulty must be easy, moderate, or hard'),
    
    body('equipment')
      .optional()
      .isArray()
      .withMessage('Equipment must be an array'),
    
    body('equipment.*')
      .optional()
      .isString()
      .withMessage('Each equipment item must be a string')
      .trim(),
    
    body('tips')
      .optional()
      .isArray()
      .withMessage('Tips must be an array'),
    
    body('tips.*')
      .optional()
      .isString()
      .withMessage('Each tip must be a string')
      .trim(),
    
    body('highlights')
      .optional()
      .isArray()
      .withMessage('Highlights must be an array'),
    
    body('highlights.*')
      .optional()
      .isString()
      .withMessage('Each highlight must be a string')
      .trim(),
    
    body('routes')
      .isArray({ min: 1 })
      .withMessage('At least one route is required'),
    
    body('routes.*.day')
      .isInt({ min: 1 })
      .withMessage('Route day must be a positive integer'),
    
    body('routes.*.distance')
      .isFloat({ min: 0 })
      .withMessage('Route distance must be a positive number'),
    
    body('routes.*.duration')
      .isFloat({ min: 0 })
      .withMessage('Route duration must be a positive number'),
    
    body('routes.*.startPoint.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Start point latitude must be between -90 and 90'),
    
    body('routes.*.startPoint.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Start point longitude must be between -180 and 180'),
    
    body('routes.*.startPoint.name')
      .notEmpty()
      .withMessage('Start point name is required')
      .trim(),
    
    body('routes.*.endPoint.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('End point latitude must be between -90 and 90'),
    
    body('routes.*.endPoint.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('End point longitude must be between -180 and 180'),
    
    body('routes.*.endPoint.name')
      .notEmpty()
      .withMessage('End point name is required')
      .trim(),
    
    body('routes.*.waypoints')
      .optional()
      .isArray()
      .withMessage('Waypoints must be an array'),
    
    body('routes.*.waypoints.*.lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('Waypoint latitude must be between -90 and 90'),
    
    body('routes.*.waypoints.*.lng')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('Waypoint longitude must be between -180 and 180'),
    
    body('routes.*.waypoints.*.name')
      .optional()
      .notEmpty()
      .withMessage('Waypoint name cannot be empty')
      .trim(),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('tags.*')
      .optional()
      .isString()
      .withMessage('Each tag must be a string')
      .isLength({ min: 1, max: 50 })
      .withMessage('Tags must be between 1 and 50 characters')
      .trim()
  ];

  // Trip ID validation
  tripIdRules = [
    param('id')
      .isMongoId()
      .withMessage('Invalid trip ID format')
  ];

  // Query validation for getting trips
  getUserTripsRules = [
    body('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    body('sort')
      .optional()
      .isIn(['createdAt', '-createdAt', 'name', '-name', 'totalDistance', '-totalDistance'])
      .withMessage('Invalid sort field'),
    
    body('tripType')
      .optional()
      .isIn(['trek', 'cycling'])
      .withMessage('Trip type must be either "trek" or "cycling"'),
    
    body('difficulty')
      .optional()
      .isIn(['easy', 'moderate', 'hard'])
      .withMessage('Difficulty must be easy, moderate, or hard')
  ];

  // Validation result handler
  validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors
      });
    }
    
    next();
  };

  // Custom validation for trip data integrity
  validateTripIntegrity = (req, res, next) => {
    const { routes, estimatedDays, totalDistance, estimatedDuration } = req.body;
    
    if (routes && routes.length > 0) {
      // Check if days are sequential
      const days = routes.map(r => r.day).sort((a, b) => a - b);
      for (let i = 0; i < days.length; i++) {
        if (days[i] !== i + 1) {
          return res.status(400).json({
            success: false,
            error: 'Route days must be sequential starting from 1'
          });
        }
      }
      
      // Validate estimated days matches route count
      if (estimatedDays && estimatedDays !== routes.length) {
        return res.status(400).json({
          success: false,
          error: 'Estimated days must match the number of routes'
        });
      }
      
      // Calculate totals and validate
      const calculatedDistance = routes.reduce((sum, route) => sum + (route.distance || 0), 0);
      const calculatedDuration = routes.reduce((sum, route) => sum + (route.duration || 0), 0);
      
      // Allow some tolerance for rounding differences
      if (totalDistance && Math.abs(totalDistance - calculatedDistance) > 0.1) {
        return res.status(400).json({
          success: false,
          error: `Total distance (${totalDistance}) doesn't match sum of route distances (${calculatedDistance})`
        });
      }
      
      if (estimatedDuration && Math.abs(estimatedDuration - calculatedDuration) > 5) {
        return res.status(400).json({
          success: false,
          error: `Estimated duration (${estimatedDuration}) doesn't match sum of route durations (${calculatedDuration})`
        });
      }
    }
    
    next();
  };
}

export default new TripValidator();