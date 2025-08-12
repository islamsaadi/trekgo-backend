import jwt from 'jsonwebtoken';
import { jwt as jwtConfig } from '../config/auth.js';

class TokenManager {
  
  async generateAccessToken(user) {

    if (!user || !user._id || !user.email) {
      throw new Error('Invalid user object provided for token generation');
    }
    if (!jwtConfig.secret) {
      throw new Error('JWT secret is not configured');
    }
    if (!jwtConfig.expiresIn) {
      throw new Error('JWT expiration time is not configured');
    }
    
    return jwt.sign(
      { id: user._id, email: user.email },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
  }

  async generateRefreshToken(user) {
    return jwt.sign(
      { id: user._id },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn }
    );
  }

  async generateTokens(user) {
    const accessToken = await this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    return {
      accessToken,
      refreshToken,
      expiresIn: jwtConfig.expiresIn
    };
  }

  async verifyAccessToken(token) {
    return jwt.verify(token, jwtConfig.secret);
  }

  async verifyRefreshToken(token) {
    return jwt.verify(token, jwtConfig.refreshSecret);
  }

  async decodeToken(token) {
    return jwt.decode(token);
  }

}

export default new TokenManager();