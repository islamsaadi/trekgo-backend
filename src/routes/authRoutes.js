import express from 'express';
import authController from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import validator from '../middleware/validator.js';

class AuthRoutes {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    this.router.post(
      '/register',
      validator.registerRules,
      validator.validateRequest,
      authController.register
    );

    this.router.post(
      '/login',
      validator.loginRules,
      validator.validateRequest,
      authController.login
    );

    this.router.post(
      '/logout',
      authMiddleware.authenticate,
      authController.logout
    );

    // validate token
    this.router.post(
      '/validate-token',
      authMiddleware.authenticate,
      authController.validateToken
    );

    this.router.post(
      '/refresh-token',
      authController.refreshToken
    );
  }

  getRouter() {
    return this.router;
  }
}

export default new AuthRoutes().getRouter();