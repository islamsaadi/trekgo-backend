import mongoose from 'mongoose';

// Coordinate schema for reuse
const coordinateSchema = {
  lat: {
    type: Number,
    required: true,
    min: [-90, 'Latitude must be between -90 and 90'],
    max: [90, 'Latitude must be between -90 and 90']
  },
  lng: {
    type: Number,
    required: true,
    min: [-180, 'Longitude must be between -180 and 180'],
    max: [180, 'Longitude must be between -180 and 180']
  }
};

// Point schema with name
const pointSchema = {
  ...coordinateSchema,
  name: {
    type: String,
    required: true,
    trim: true
  }
};

// Weather forecast schema
const weatherSchema = {
  date: {
    type: String,
    required: true
  },
  avgTemp: Number,
  minTemp: Number,
  maxTemp: Number,
  avgHumidity: Number,
  avgWindSpeed: Number,
  weather: {
    main: String,
    description: String,
    icon: String
  }
};

// Route instruction schema
const instructionSchema = {
  segment: Number,
  step: Number,
  instruction: String,
  distance: Number,
  duration: Number,
  name: String
};

// Route schema for each day
const routeSchema = {
  day: {
    type: Number,
    required: true,
    min: 1
  },
  distance: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  startPoint: pointSchema,
  endPoint: pointSchema,
  waypoints: [pointSchema],
  coordinates: [{
    0: Number, // lng
    1: Number  // lat
  }],
  elevation: {
    ascent: {
      type: Number,
      default: 0
    },
    descent: {
      type: Number,
      default: 0
    }
  },
  instructions: [instructionSchema],
  weatherForecast: [weatherSchema]
};

// Main trip schema
const tripSchema = new mongoose.Schema({
  // User and basic info
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Trip name is required'],
    trim: true,
    maxlength: [100, 'Trip name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Trip details
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  tripType: {
    type: String,
    required: [true, 'Trip type is required'],
    enum: {
      values: ['trek', 'cycling'],
      message: 'Trip type must be either trek or cycling'
    },
    lowercase: true
  },
  
  // Trip metrics
  totalDistance: {
    type: Number,
    required: true,
    min: [0, 'Total distance must be positive']
  },
  estimatedDuration: {
    type: Number,
    required: true,
    min: [0, 'Duration must be positive']
  },
  estimatedDays: {
    type: Number,
    required: true,
    min: [1, 'Must be at least 1 day'],
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard'],
    default: 'moderate'
  },
  bestTime: {
    type: String,
    trim: true
  },
  
  // Trip content
  equipment: [{
    type: String,
    trim: true
  }],
  tips: [{
    type: String,
    trim: true
  }],
  highlights: [{
    type: String,
    trim: true
  }],
  countryImage: {
    type: String,
    trim: true
  },
  
  // Route data
  routes: [routeSchema],
  
  // Metadata
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  }
}, {
  timestamps: true,
  collection: 'trips'
});

// Indexes for performance
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ userId: 1, name: 1 });
tripSchema.index({ destination: 1 });
tripSchema.index({ tripType: 1 });
tripSchema.index({ difficulty: 1 });
tripSchema.index({ isPublic: 1, createdAt: -1 });
tripSchema.index({ tags: 1 });

// Virtual for route count
tripSchema.virtual('routeCount').get(function() {
  return this.routes ? this.routes.length : 0;
});

// Instance methods
tripSchema.methods.toJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

tripSchema.methods.togglePublic = function() {
  this.isPublic = !this.isPublic;
  return this.save();
};

// Static methods
tripSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });
  
  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  if (options.populate) {
    query.populate(options.populate);
  }
  
  return query;
};

tripSchema.statics.findPublicTrips = function(options = {}) {
  const query = this.find({ isPublic: true });
  
  if (options.destination) {
    query.where('destination').regex(new RegExp(options.destination, 'i'));
  }
  
  if (options.tripType) {
    query.where('tripType').equals(options.tripType);
  }
  
  if (options.difficulty) {
    query.where('difficulty').equals(options.difficulty);
  }
  
  return query.sort({ createdAt: -1 }).limit(options.limit || 20);
};

tripSchema.statics.findByDestination = function(destination, options = {}) {
  const query = this.find({
    destination: { $regex: new RegExp(destination, 'i') }
  });
  
  if (options.userId) {
    query.where('userId').equals(options.userId);
  }
  
  return query.sort({ createdAt: -1 });
};

// Pre-save middleware
tripSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Ensure routes array exists
  if (!this.routes) {
    this.routes = [];
  }
  
  // Calculate total metrics from routes if not provided
  if (this.routes.length > 0 && !this.totalDistance) {
    this.totalDistance = this.routes.reduce((total, route) => total + (route.distance || 0), 0);
  }
  
  if (this.routes.length > 0 && !this.estimatedDuration) {
    this.estimatedDuration = this.routes.reduce((total, route) => total + (route.duration || 0), 0);
  }
  
  if (this.routes.length > 0 && !this.estimatedDays) {
    this.estimatedDays = this.routes.length;
  }
  
  next();
});

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;