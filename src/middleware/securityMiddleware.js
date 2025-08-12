import crypto from 'crypto';

class SecurityMiddleware {


  generateCSRFToken(req, res, next) {
    if (!req.session) {
      req.session = {};
    }
    
    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    }
    
    req.csrfToken = () => req.session.csrfToken;
    next();
  }

  preventClickjacking(req, res, next) {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  }

  enforceHTTPS(req, res, next) {
    if (process.env.NODE_ENV === 'production' && !req.secure) {
      return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
  }
}

export default new SecurityMiddleware();