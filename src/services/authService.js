import User from '../models/User.js';
import tokenManager from '../utils/tokenManager.js';

class AuthService {

  async register(userData) {
    const { name, email, password } = userData;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already registered');
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
      throw new Error('Invalid credentials');
    }

    if (user.isAccountLocked()) {
      throw new Error('Account temporarily locked due to multiple failed attempts');
    }

    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      await user.incrementFailedAttempts();
      throw new Error('Invalid credentials');
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
      throw new Error('User not found');
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
      throw new Error('Invalid access token');
    }
  }
  
  async refreshToken(refreshToken) {
    const decoded = await tokenManager.verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new Error('User not found');
    }

    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      throw new Error('Invalid refresh token');
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
