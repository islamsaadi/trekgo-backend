# TrekGo Backend

A robust and secure Node.js backend API for an AI-powered travel planning application. This server provides intelligent trip generation, user authentication, comprehensive trip management, and integrates with various external services for weather data, route optimization, and destination imagery.

## 🌐 Frontend Repository
```
https://github.com/islamsaadi/trekgo-frontend
```

## 🚀 Features

- **AI-Powered Trip Planning**: Generate personalized travel itineraries using Groq LLM with intelligent route optimization
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing and account lockout protection
- **Trip Management**: Create, view, and delete travel plans with persistent storage
- **Centralized Error Handling**: Comprehensive error management with specific error codes and user-friendly messages
- **Security First**: Multi-layered security including CSRF protection, rate limiting, input sanitization, and XSS protection
- **External API Integrations**: 
  - Real-time weather data integration
  - OpenRouteService (ORS) for route optimization
  - AI-generated destination images
- **Data Validation**: Request validation using Joi and express-validator with custom trip validators
- **MongoDB Integration**: Persistent data storage with Mongoose ODM and optimized queries

## 🌐 API Integrations

This project integrates with several external APIs to provide comprehensive travel planning functionality:

### Groq AI Integration
- **Purpose**: AI-powered trip generation and travel recommendations
- **Model**: OpenAI GPT-based language model

### Weather API
- **Purpose**: Real-time and forecast weather data for destinations

### OpenRouteService (ORS)
- **Purpose**: Advanced route optimization and navigation services

### Image Generation Service
- **Purpose**: Travel destination imagery

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js with advanced middleware
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with refresh token rotation
- **AI/ML**: Groq SDK for LLM integration with custom prompt engineering
- **Security**: Helmet, CORS, Rate Limiting, CSRF Protection, XSS Prevention
- **Validation**: Joi, Express Validator with custom trip validation rules
- **Error Handling**: Centralized error management with custom error classes
- **Development**: Nodemon for hot reloading and development workflow

## 🔧 Architecture

### Centralized Error Handling
- **Custom Error Classes**: `AppError` class with status codes and error codes
- **Error Code System**: Standardized error codes for consistent frontend handling
- **Structured Responses**: Uniform error response format across all endpoints

### Smart Coordinate System
- **Coordinate Validation**: Multi-layer validation for routing coordinates
- **Fallback Mechanisms**: Automatic coordinate correction for failed routing points
- **Search Radius**: Unlimited search radius for finding routable points
- **Known Good Coordinates**: Database of verified coordinates for major destinations

### Enhanced Security
- **Account Lockout**: Protection against brute force attacks
- **Token Management**: Secure refresh token rotation and validation
- **Input Sanitization**: MongoDB injection and XSS protection
- **Rate Limiting**: Configurable rate limits per endpoint

## 📋 Requirements

Before running this application, ensure you have the following installed:

- **Node.js**: Version 16.x or higher
- **npm**: Version 7.x or higher (comes with Node.js)
- **MongoDB**: Version 4.4 or higher (local installation or MongoDB Atlas)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=5005
NODE_ENV=dev / production

# Database
MONGODB_URI=mongodb://localhost:27017/travel-planner
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/travel-planner

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-secret-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Groq AI Configuration
GROQ_API_KEY=your-groq-api-key-here
GROQ_MODEL='openai/gpt-oss-120b' / 'llama-3.3-70b-versatile'

# External Services
WEATHER_API_KEY=your-weather-api-key
ORS_API_KEY=your-openrouteservice-api-key

# Security
CSRF_SECRET=your-csrf-secret-key
```

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-planner-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   
   # Or ensure MongoDB Atlas connection is configured
   ```

5. **Run the application**

   **Development mode** (with auto-reload):
   ```bash
   npm run dev
   ```

   **Production mode**:
   ```bash
   npm start
   ```

The server will start on `http://localhost:5005` (or your configured PORT).

## 📖 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | User login | No |
| POST | `/api/auth/logout` | User logout | Yes |
| POST | `/api/auth/refresh` | Refresh JWT token | Yes |

### Trip Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/trips/generate` | Generate AI-powered trip | Yes |
| POST | `/api/trips` | Save a trip | Yes |
| GET | `/api/trips` | Get user's trips | Yes |
| GET | `/api/trips/:id` | Get specific trip | Yes |
| DELETE | `/api/trips/:id` | Delete trip | Yes |

### Request Examples

**Register User:**
```json
POST /api/auth/register
{
  "name": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123!!"
}
```

**Generate Trip:**
```json
POST /api/trips/generate
{
  "destination": "Eilat, Israel",
  "tripType": "trek"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "destination": "Eilat",
    "city": "Eilat, Israel",
    "tripType": "trek",
    "totalDistance": 25.4,
    "estimatedDuration": 480,
    "estimatedDays": 3,
    "routes": [...],
    "weatherForecast": [...],
    "highlights": [...],
    "difficulty": "moderate",
    "equipment": [...],
    "tips": [...]
  }
}
```

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Email already registered",
    "code": "DUPLICATE_EMAIL"
  }
}
```

## 🗂️ Project Structure

```
trekgo-backend/
├── server.js                 # Application entry point
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
└── src/
    ├── app.js                # Express app configuration
    ├── config/               # Configuration files
    │   ├── auth.js          # Authentication config
    │   ├── database.js      # Database connection
    │   └── security.js      # Security configurations
    ├── controllers/          # Route controllers
    │   ├── authController.js
    │   └── tripController.js
    ├── middleware/           # Custom middleware
    │   ├── authMiddleware.js      # JWT authentication
    │   ├── errorHandler.js        # Centralized error handling
    │   ├── securityMiddleware.js  # CSRF and security
    │   ├── tripValidator.js       # Trip validation rules
    │   └── validator.js           # General validation
    ├── models/               # Database models
    │   ├── Trip.js
    │   └── User.js
    ├── routes/               # Route definitions
    │   ├── authRoutes.js
    │   └── tripRoutes.js
    ├── services/             # Business logic services
    │   ├── authService.js         # Authentication logic
    │   ├── constraintService.js   # Trip constraint validation
    │   ├── groqService.js         # AI/LLM integration
    │   ├── imageService.js        # Destination images
    │   ├── llmService.js          # Route generation orchestration
    │   ├── orsService.js          # OpenRouteService integration
    │   ├── tripService.js         # Trip management
    │   └── weatherService.js      # Weather data integration
    └── utils/                # Utility functions
        ├── AppError.js            # Custom error class
        ├── errorCodes.js          # Centralized error codes
        └── tokenManager.js        # JWT token management
```

## 📊 Error Handling System

### Available Error Codes
- `VALIDATION_ERROR` (400) - Request validation failed
- `DUPLICATE_EMAIL` (409) - Email already registered
- `INVALID_CREDENTIALS` (401) - Invalid login credentials
- `ACCOUNT_LOCKED` (423) - Account temporarily locked
- `USER_NOT_FOUND` (404) - User not found
- `INVALID_TOKEN` (401) - Invalid or malformed token
- `TOKEN_EXPIRED` (401) - Token has expired
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Access forbidden
- `TRIP_NOT_FOUND` (404) - Trip not found
- `TRIP_GENERATION_FAILED` (500) - AI trip generation failed
- `EXTERNAL_SERVICE_ERROR` (503) - External API unavailable
- `SERVER_ERROR` (500) - Internal server error

### Error Response Structure
All errors follow a consistent format:
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "SPECIFIC_ERROR_CODE"
  }
}
```

## 🔒 Security Features

- **CORS Protection**: Configured for specific origins with credential support
- **Helmet**: Comprehensive security headers for protection against common vulnerabilities
- **Rate Limiting**: Configurable rate limiting to prevent brute force attacks
- **CSRF Protection**: Cross-Site Request Forgery protection with token validation
- **Input Sanitization**: MongoDB injection and XSS protection with express-mongo-sanitize
- **Parameter Pollution Protection**: HPP middleware to prevent parameter pollution attacks
- **JWT Security**: Secure token-based authentication with refresh token rotation
- **Password Hashing**: Bcrypt with configurable salt rounds and password strength validation
- **Account Lockout**: Automatic account lockout after failed login attempts
- **Error Information Disclosure**: Sanitized error responses to prevent information leakage

### Development Workflow
```bash
# Start development server with hot reload
npm run dev

# Start production server
npm start

# Check logs for debugging
tail -f logs/app.log
```

## 🔧 Development

### Code Style & Standards
This project follows modern ES6+ standards with ES Modules:
- **ES6+ Features**: Arrow functions, destructuring, async/await, template literals
- **Consistent Naming**: camelCase for variables, PascalCase for classes
- **Error Handling**: Comprehensive try-catch blocks with proper error propagation
- **Clean Code**: Modular architecture with single responsibility principle
- **Documentation**: JSDoc comments for complex functions and business logic

### Environment Setup
```bash
# Clone and setup
git clone https://github.com/islamsaadi/trekgo-backend.git
cd trekgo-backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm run dev
```

## 📝 License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 TrekGO Backend

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 📞 Support

For support, email issaadi0@gmail.com or create an issue on GitHub.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [MongoDB](https://www.mongodb.com/) - Document-based database
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [Groq](https://groq.com/) - High-performance AI inference
- [OpenRouteService](https://openrouteservice.org/) - Open-source routing engine
- [JWT.io](https://jwt.io/) - JSON Web Token standard
- [Helmet.js](https://helmetjs.github.io/) - Security middleware
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Password hashing library

---

**Ready for your next adventure! 🌍✈️🥾**
