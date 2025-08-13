import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { jwt as jwtConfig } from '../config/auth.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class AuthMiddleware {

  async authenticate(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        throw new AppError(ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED], 401, ERROR_CODES.UNAUTHORIZED);
      }

      const decoded = jwt.verify(token, jwtConfig.secret);
      const user = await User.findById(decoded.id).select('-password -refreshTokens');

      if (!user) {
        throw new AppError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND], 404, ERROR_CODES.USER_NOT_FOUND);
      }

      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else if (error.name === 'JsonWebTokenError') {
        next(new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_TOKEN], 401, ERROR_CODES.INVALID_TOKEN));
      } else if (error.name === 'TokenExpiredError') {
        next(new AppError(ERROR_MESSAGES[ERROR_CODES.TOKEN_EXPIRED], 401, ERROR_CODES.TOKEN_EXPIRED));
      } else {
        next(new AppError(ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED], 401, ERROR_CODES.UNAUTHORIZED));
      }
    }
  }

  async validateCSRFToken(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const csrfToken = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!csrfToken || csrfToken !== sessionToken) {
      return next(new AppError(ERROR_MESSAGES[ERROR_CODES.FORBIDDEN], 403, ERROR_CODES.FORBIDDEN));
    }

    next();
  }
  
}

export default new AuthMiddleware();
