import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import securityConfig from './config/security.js';
import securityMiddleware from './middleware/securityMiddleware.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import tripRoutes from './routes/tripRoutes.js';

class App {
  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    
  }

  setupMiddleware() {

    console.log('Setting up middleware...');

    this.app.use(cors(securityConfig.cors));
    this.app.options(/^\/.*$/, cors(securityConfig.cors));

    this.app.use(helmet({
      contentSecurityPolicy: securityConfig.headers.contentSecurityPolicy,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    const limiter = rateLimit({
      windowMs: securityConfig.rateLimit.windowMs,
      max: securityConfig.rateLimit.max,
      message: 'Too many requests from this IP',
      skip: (req) => req.method === 'OPTIONS'
    });

    this.app.use(limiter);
    this.app.use(express.json({ limit: securityConfig.json.limit }));
    this.app.use(express.urlencoded(securityConfig.urlencoded));
    this.app.use(hpp());
    this.app.use(securityMiddleware.generateCSRFToken);

  }

  setupRoutes() {
    this.app.use('/api/auth', authRoutes);
    
    this.app.use('/api/trips', tripRoutes);
    
    this.app.get('/api/csrf-token', (req, res) => {
      res.cookie('XSRF-TOKEN', req.csrfToken() );
      res.json({ csrfToken: req.csrfToken() });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);
  }

  getApp() {
    return this.app;
  }
}

export default new App().getApp();