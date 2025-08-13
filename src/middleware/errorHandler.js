import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';
import AppError from '../utils/AppError.js';

class ErrorHandler {

  handle(err, req, res, next) {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode;
    error.errorCode = err.errorCode;

    if (err.name === 'CastError') {
      error = {
        message: ERROR_MESSAGES[ERROR_CODES.RESOURCE_NOT_FOUND],
        statusCode: 404,
        errorCode: ERROR_CODES.RESOURCE_NOT_FOUND
      };
    }

    if (err.code === 409) {
      const field = Object.keys(err.keyPattern)[0];
      const errorCode = field === 'email' ? ERROR_CODES.DUPLICATE_EMAIL : ERROR_CODES.DUPLICATE_FIELD;
      error = {
        message: field === 'email' ? ERROR_MESSAGES[ERROR_CODES.DUPLICATE_EMAIL] : ERROR_MESSAGES[ERROR_CODES.DUPLICATE_FIELD],
        statusCode: 409,
        errorCode
      };
    }

    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      error = {
        message,
        statusCode: 400,
        errorCode: ERROR_CODES.VALIDATION_ERROR
      };
    }

    if (err.name === 'JsonWebTokenError') {
      error = {
        message: ERROR_MESSAGES[ERROR_CODES.INVALID_TOKEN],
        statusCode: 401,
        errorCode: ERROR_CODES.INVALID_TOKEN
      };
    }

    if (err.name === 'TokenExpiredError') {
      error = {
        message: ERROR_MESSAGES[ERROR_CODES.TOKEN_EXPIRED],
        statusCode: 401,
        errorCode: ERROR_CODES.TOKEN_EXPIRED
      };
    }

    res.status(error.statusCode || 500).json({
      success: false,
      error: {
        message: error.message || ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR],
        code: error.errorCode || ERROR_CODES.SERVER_ERROR
      }
    });
  }
  
}

export default new ErrorHandler().handle;