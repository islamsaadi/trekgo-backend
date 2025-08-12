import authService from '../services/authService.js';

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken;
      await authService.logout(req.user.id, refreshToken);
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // valudate token
  async validateToken(req, res, next) {
    try {
      const accessToken = req.token;
      const decoded = await authService.validateToken(accessToken);
      // check if the token is valid
      // check if the decoded token has an id and is not expired
      const expired = (exp) => {
        return exp < Math.floor(Date.now() / 1000);
      };
      
      if (!decoded || !decoded.id || expired(decoded.exp)) {
        return res.status(401).json({
          success: false,
          valid: false
        });
      } 

      // if valid, return the decoded token
      res.json({
        success: true,
        valid: true
      });

    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();