# Travel Planner Backend

A robust and secure Node.js backend API for a travel planning application. This server provides AI-powered trip generation, user authentication, trip management, and integrates with various external services for weather, routing, and image generation.

## Front End ?
Find here: 
```
https://github.com/islamsaadi/trekgo-frontend
```

## 🚀 Features

- **AI-Powered Trip Planning**: Generate travel itineraries using Groq LLM
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Trip Management**: Create, view trip from history, and delete travel plans
- **Security First**: Comprehensive security measures including CSRF protection, rate limiting, and input sanitization
- **External Integrations**: 
  - Weather data integration
  - Route optimization services (ORS)
  - Travel images
- **Data Validation**: Request validation using Joi and express-validator
- **MongoDB Integration**: Persistent data storage with Mongoose ODM

## 🌐 API Integrations

This project integrates with several external APIs to provide comprehensive travel planning functionality:

### Groq AI Integration
- **Purpose**: AI-powered trip generation and travel recommendations
- **Model**: OpenAI GPT-based language model
- **Features**: 
    - Intelligent itinerary generation
    - Personalized travel suggestions
    - Natural language processing for travel queries

### Weather API
- **Purpose**: Real-time and forecast weather data for destinations
- **Features**:
    - Current weather conditions
    - Weather forecasts for trip planning
    - Climate information for destination selection

### OpenRouteService (ORS)
- **Purpose**: Route optimization and navigation services
- **Features**:
    - Route planning and optimization
    - Distance and duration calculations
    - Geolocation services
    - Direction mapping

### Image Generation Service
- **Purpose**: Travel destination imagery
- **Features**:
    - Destination photos
    - Location-specific visuals
    - Trip planning visual aids

### Configuration
All API integrations require proper API keys configured in your `.env` file:
```env
GROQ_API_KEY=your-groq-api-key-here
WEATHER_API_KEY=your-weather-api-key
ORS_API_KEY=your-openrouteservice-api-key
```

## 🛠️ Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **AI/ML**: Groq SDK for LLM integration
- **Security**: Helmet, CORS, Rate Limiting, CSRF Protection
- **Validation**: Joi, Express Validator
- **Development**: Nodemon for hot reloading

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
GROQ_MODEL='openai/gpt-oss-120b'

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
  "destination": "Paris, France",
  "tripType": "trek" / "cycling"
}
```

## 🗂️ Project Structure

```
travel-planner-backend/
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
    │   ├── authMiddleware.js
    │   ├── errorHandler.js
    │   ├── securityMiddleware.js
    │   ├── tripValidator.js
    │   └── validator.js
    ├── models/               # Database models
    │   ├── Trip.js
    │   └── User.js
    ├── routes/               # Route definitions
    │   ├── authRoutes.js
    │   └── tripRoutes.js
    ├── services/             # Business logic services
    │   ├── authService.js
    │   ├── constraintService.js
    │   ├── groqService.js
    │   ├── imageService.js
    │   ├── llmService.js
    │   ├── orsService.js
    │   ├── tripService.js
    │   └── weatherService.js
    └── utils/                # Utility functions
        └── tokenManager.js
```

## 🔒 Security Features

- **CORS Protection**: Configured for specific origins
- **Helmet**: Security headers for protection against common vulnerabilities
- **Rate Limiting**: Prevents brute force attacks
- **CSRF Protection**: Cross-Site Request Forgery protection
- **Input Sanitization**: MongoDB injection and XSS protection
- **Parameter Pollution Protection**: HPP middleware
- **JWT Security**: Secure token-based authentication
- **Password Hashing**: Bcrypt with salt rounds

## 🔧 Development

### Code Style
This project follows ES6+ standards with ES Modules:
- Uses ES6+ features (arrow functions, destructuring, async/await)
- Follows consistent naming conventions
- Includes proper error handling
- Has appropriate comments for complex logic

## 📝 License

This project is licensed under the MIT License.

```
MIT License

Copyright (c) 2025 Travel Planner Backend

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

- [Express.js](https://expressjs.com/) - Web framework
- [MongoDB](https://www.mongodb.com/) - Database
- [Groq](https://groq.com/) - AI/LLM services
- [OpenRouteService](https://openrouteservice.org/) - Routing services

---

**Happy Traveling! ✈️**
