import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { jwt as jwtConfig } from '../config/auth.js';

class AuthMiddleware {

  async authenticate(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error();
      }

      const decoded = jwt.verify(token, jwtConfig.secret);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');

      if (!user) {
        throw new Error();
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Please authenticate' });
    }
  }

  async validateCSRFToken(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || csrfToken !== sessionToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    next();
  }
  
}

export default new AuthMiddleware();
