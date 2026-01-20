import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/httpErrors.js';
import { logger } from '../utils/logger.js';

export function authMiddleware(req, res, next) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const authHeader = req.headers.authorization;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    logger.debug(`[${requestId}] 🔐 TOKEN VERIFICATION STARTED`, {
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      clientIp
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`[${requestId}] ⚠️  MISSING OR INVALID TOKEN FORMAT`, {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
        authHeaderFormat: authHeader ? 'provided but invalid format' : 'missing',
        clientIp,
        timestamp: new Date().toISOString()
      });

      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    logger.debug(`[${requestId}] 🔍 Verifying JWT Token`, {
      tokenLength: token.length,
      clientIp
    });

    const decoded = jwt.verify(token, config.jwt.secret);

    const duration = Date.now() - startTime;
    logger.debug(`[${requestId}] ✅ TOKEN VERIFICATION SUCCESSFUL`, {
      userId: decoded.id,
      userEmail: decoded.email,
      userRole: decoded.role,
      path: req.path,
      method: req.method,
      duration: `${duration}ms`,
      clientIp
    });

    req.user = decoded;
    next();
  } catch (error) {
    const duration = Date.now() - startTime;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    if (error.name === 'JsonWebTokenError') {
      logger.warn(`[${requestId}] ⚠️  INVALID TOKEN - JWT VERIFICATION FAILED`, {
        errorMessage: error.message,
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        clientIp,
        reason: 'Token signature is invalid or corrupted',
        timestamp: new Date().toISOString()
      });

      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      logger.warn(`[${requestId}] ⚠️  TOKEN EXPIRED`, {
        expiredAt: error.expiredAt,
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        clientIp,
        reason: 'Token expiration time has passed',
        timestamp: new Date().toISOString()
      });

      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof UnauthorizedError) {
      logger.warn(`[${requestId}] ⚠️  AUTHORIZATION ERROR - ${error.message}`, {
        path: req.path,
        method: req.method,
        duration: `${duration}ms`,
        clientIp,
        timestamp: new Date().toISOString()
      });

      next(error);
    } else {
      logger.error(
        `[${requestId}] ❌ UNEXPECTED ERROR IN TOKEN VERIFICATION`,
        error,
        {
          path: req.path,
          method: req.method,
          errorMessage: error.message,
          errorName: error.name,
          duration: `${duration}ms`,
          clientIp,
          timestamp: new Date().toISOString()
        }
      );

      next(error);
    }
  }
}

export function requireAdmin(req, res, next) {
  const requestId = Math.random().toString(36).substring(7);
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  logger.debug(`[${requestId}] 🛡️  Checking Admin Access`, {
    userId: req.user?.id,
    userRole: req.user?.role,
    path: req.path,
    clientIp
  });

  if (!req.user) {
    logger.warn(`[${requestId}] ⚠️  ADMIN ACCESS DENIED - No User Context`, {
      path: req.path,
      reason: 'User not authenticated',
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'ADMIN') {
    logger.warn(`[${requestId}] ⚠️  ADMIN ACCESS DENIED - Insufficient Permissions`, {
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      path: req.path,
      reason: `User role "${req.user.role}" is not "ADMIN"`,
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new ForbiddenError('Admin access required'));
  }

  logger.debug(`[${requestId}] ✅ Admin Access Verified`, {
    userId: req.user.id,
    userEmail: req.user.email,
    path: req.path,
    clientIp
  });

  next();
}

export function requireVendor(req, res, next) {
  const requestId = Math.random().toString(36).substring(7);
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  logger.debug(`[${requestId}] 🛡️  Checking Vendor Access`, {
    userId: req.user?.id,
    userRole: req.user?.role,
    path: req.path,
    clientIp
  });

  if (!req.user) {
    logger.warn(`[${requestId}] ⚠️  VENDOR ACCESS DENIED - No User Context`, {
      path: req.path,
      reason: 'User not authenticated',
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new UnauthorizedError('Authentication required'));
  }

  if (req.user.role !== 'VENDOR') {
    logger.warn(`[${requestId}] ⚠️  VENDOR ACCESS DENIED - Insufficient Permissions`, {
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      path: req.path,
      reason: `User role "${req.user.role}" is not "VENDOR"`,
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new ForbiddenError('Vendor access required'));
  }

  logger.debug(`[${requestId}] ✅ Vendor Access Verified`, {
    userId: req.user.id,
    userEmail: req.user.email,
    vendorId: req.user.vendor_id,
    path: req.path,
    clientIp
  });

  next();
}

export function requireErpApiKey(req, res, next) {
  const requestId = Math.random().toString(36).substring(7);
  const apiKey = req.headers['x-erp-api-key'];
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

  logger.debug(`[${requestId}] 🔑 Checking ERP API Key`, {
    hasApiKey: !!apiKey,
    path: req.path,
    clientIp
  });

  if (!apiKey) {
    logger.warn(`[${requestId}] ⚠️  ERP API KEY MISSING`, {
      path: req.path,
      reason: 'x-erp-api-key header not provided',
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new UnauthorizedError('Invalid ERP API key'));
  }

  const isValidKey = apiKey === config.erp.apiKey;

  if (!isValidKey) {
    logger.warn(`[${requestId}] ⚠️  ERP API KEY INVALID`, {
      path: req.path,
      apiKeyLength: apiKey.length,
      reason: 'API key does not match configured key',
      clientIp,
      timestamp: new Date().toISOString()
    });

    return next(new UnauthorizedError('Invalid ERP API key'));
  }

  logger.debug(`[${requestId}] ✅ ERP API Key Verified`, {
    path: req.path,
    clientIp
  });

  next();
}
