import User from '../models/User.js';
import tokenManager from '../utils/tokenManager.js';
import AppError from '../utils/AppError.js';
import { ERROR_CODES, ERROR_MESSAGES } from '../utils/errorCodes.js';

class AuthService {

  async register(userData) {
    const { name, email, password } = userData;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.DUPLICATE_EMAIL], 409, ERROR_CODES.DUPLICATE_EMAIL);
    }

    const user = new User({ name, email, password });
    await user.save();

    const tokens = await tokenManager.generateTokens(user);
    
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return {
      user: user.toJSON(),
      ...tokens
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS], 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    if (user.isAccountLocked()) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.ACCOUNT_LOCKED], 423, ERROR_CODES.ACCOUNT_LOCKED);
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incrementFailedAttempts();
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_CREDENTIALS], 401, ERROR_CODES.INVALID_CREDENTIALS);
    }

    await user.resetFailedAttempts();
    
    const tokens = await tokenManager.generateTokens(user);
    
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return {
      user: user.toJSON(),
      ...tokens
    };
  }

  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND], 404, ERROR_CODES.USER_NOT_FOUND);
    }

    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== refreshToken
    );
    
    await user.save();
  }

  async validateToken(accessToken) {
    try {
      const decoded = await tokenManager.verifyAccessToken(accessToken);
      return decoded;
    } catch (error) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_TOKEN], 401, ERROR_CODES.INVALID_TOKEN);
    }
  }
  
  async refreshToken(refreshToken) {
    const decoded = await tokenManager.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.USER_NOT_FOUND], 404, ERROR_CODES.USER_NOT_FOUND);
    }

    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      throw new AppError(ERROR_MESSAGES[ERROR_CODES.INVALID_REFRESH_TOKEN], 401, ERROR_CODES.INVALID_REFRESH_TOKEN);
    }

    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== refreshToken
    );

    const tokens = await tokenManager.generateTokens(user);
    
    user.refreshTokens.push({ token: tokens.refreshToken });
    await user.save();

    return tokens;
  }
  
}

export default new AuthService();
