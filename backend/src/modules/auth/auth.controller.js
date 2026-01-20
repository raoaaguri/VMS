import * as authService from './auth.service.js';
import { BadRequestError } from '../../utils/httpErrors.js';
import { logger } from '../../utils/logger.js';

export async function loginHandler(req, res, next) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

    logger.info(`[${requestId}] 🔐 LOGIN REQUEST RECEIVED`, {
      email,
      clientIp,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path
    });

    // Validate input
    if (!email || !password) {
      logger.warn(`[${requestId}] ⚠️  VALIDATION ERROR - Missing Credentials`, {
        emailProvided: !!email,
        passwordProvided: !!password,
        clientIp
      });

      throw new BadRequestError('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn(`[${requestId}] ⚠️  VALIDATION ERROR - Invalid Email Format`, {
        email,
        clientIp
      });

      throw new BadRequestError('Invalid email format');
    }

    logger.debug(`[${requestId}] ✅ Input Validation Passed`, {
      emailLength: email.length,
      passwordLength: password.length
    });

    logger.info(`[${requestId}] 🔍 Attempting User Authentication`, {
      email,
      timestamp: new Date().toISOString()
    });

    const result = await authService.login(email, password);

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ LOGIN SUCCESSFUL`, {
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      vendor_id: result.user.vendor_id || null,
      duration: `${duration}ms`,
      clientIp,
      timestamp: new Date().toISOString()
    });

    // Event Log: Successful Login
    logger.info(`[${requestId}] 📊 LOGIN EVENT CREATED`, {
      eventType: 'USER_LOGIN_SUCCESS',
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      vendorId: result.user.vendor_id || null,
      clientIp,
      userAgent: req.get('user-agent'),
      responseTime: `${duration}ms`,
      tokenIssued: true,
      timestamp: new Date().toISOString(),
      sessionCreated: true
    });

    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    let errorCategory = 'UNKNOWN_ERROR';
    let statusCode = 500;

    if (error.message === 'Email and password are required') {
      errorCategory = 'VALIDATION_ERROR';
      statusCode = 400;
    } else if (error.message === 'Invalid email format') {
      errorCategory = 'VALIDATION_ERROR';
      statusCode = 400;
    } else if (error.message === 'Invalid email or password') {
      errorCategory = 'AUTHENTICATION_FAILED';
      statusCode = 401;
    } else if (error.message.includes('Your account is not active')) {
      errorCategory = 'ACCOUNT_INACTIVE';
      statusCode = 401;
    } else if (error.message.includes('pending approval') || error.message.includes('rejected')) {
      errorCategory = 'VENDOR_NOT_APPROVED';
      statusCode = 401;
    } else if (error.name === 'BadRequestError') {
      errorCategory = 'BAD_REQUEST';
      statusCode = 400;
    }

    logger.error(`[${requestId}] ❌ LOGIN FAILED - ${errorCategory}`, error, {
      email: req.body.email,
      errorMessage: error.message,
      errorCategory,
      statusCode,
      duration: `${duration}ms`,
      clientIp: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Event Log: Failed Login
    logger.error(`[${requestId}] 📊 LOGIN EVENT FAILED`, error, {
      eventType: 'USER_LOGIN_FAILED',
      email: req.body.email,
      errorCategory,
      errorMessage: error.message,
      statusCode,
      clientIp: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      responseTime: `${duration}ms`,
      tokenIssued: false,
      failureReason: errorCategory,
      timestamp: new Date().toISOString(),
      sessionCreated: false
    });

    // Don't pass to error handler yet - use next() to ensure consistent error formatting
    next(error);
  }
}
