import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env.js';
import { getDbClient } from '../../config/db.js';
import { UnauthorizedError } from '../../utils/httpErrors.js';
import { logger } from '../../utils/logger.js';

export async function login(email, password) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  const db = getDbClient();

  try {
    logger.debug(`[${requestId}] 🔎 Querying User from Database`, {
      email,
      timestamp: new Date().toISOString()
    });

    const { data: users, error } = await db
      .from('users')
      .select('id, name, email, password_hash, role, vendor_id, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      logger.error(
        `[${requestId}] ❌ DATABASE ERROR - User Query Failed`,
        new Error(error.message),
        {
          email,
          errorCode: error.code,
          errorDetails: error.details,
          timestamp: new Date().toISOString()
        }
      );
      throw new Error(`Database error: ${error.message}`);
    }

    if (!users) {
      logger.warn(`[${requestId}] ⚠️  AUTHENTICATION FAILED - User Not Found`, {
        email,
        reason: 'No user record found with this email',
        timestamp: new Date().toISOString()
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.debug(`[${requestId}] ✅ User Found in Database`, {
      userId: users.id,
      userEmail: users.email,
      userRole: users.role,
      userActive: users.is_active,
      hasVendorId: !!users.vendor_id
    });

    // Password validation
    logger.debug(`[${requestId}] 🔑 Validating Password`, {
      userId: users.id,
      email: users.email
    });

    const isPasswordValid = await bcrypt.compare(password, users.password_hash);

    if (!isPasswordValid) {
      logger.warn(`[${requestId}] ⚠️  AUTHENTICATION FAILED - Invalid Password`, {
        email,
        userId: users.id,
        reason: 'Password hash does not match',
        timestamp: new Date().toISOString()
      });
      throw new UnauthorizedError('Invalid email or password');
    }

    logger.debug(`[${requestId}] ✅ Password Validation Successful`, {
      userId: users.id,
      email: users.email
    });

    // Check account active status
    if (!users.is_active) {
      logger.warn(`[${requestId}] ⚠️  AUTHORIZATION FAILED - Account Inactive`, {
        userId: users.id,
        email: users.email,
        reason: 'User account has been deactivated',
        timestamp: new Date().toISOString()
      });
      throw new UnauthorizedError('Your account is not active. Please contact the administrator.');
    }

    logger.debug(`[${requestId}] ✅ Account Active Status Verified`, {
      userId: users.id,
      email: users.email
    });

    // Vendor-specific checks
    if (users.role === 'VENDOR' && users.vendor_id) {
      logger.debug(`[${requestId}] 🏢 Checking Vendor Approval Status`, {
        userId: users.id,
        vendorId: users.vendor_id
      });

      const { data: vendor, error: vendorError } = await db
        .from('vendors')
        .select('status, name')
        .eq('id', users.vendor_id)
        .maybeSingle();

      if (vendorError) {
        logger.error(
          `[${requestId}] ❌ DATABASE ERROR - Vendor Query Failed`,
          new Error(vendorError.message),
          {
            vendorId: users.vendor_id,
            userId: users.id,
            errorCode: vendorError.code,
            timestamp: new Date().toISOString()
          }
        );
        throw new Error(`Database error: ${vendorError.message}`);
      }

      if (!vendor) {
        logger.error(
          `[${requestId}] ❌ INTEGRITY ERROR - Vendor Record Not Found`,
          new Error('Vendor referenced by user does not exist'),
          {
            vendorId: users.vendor_id,
            userId: users.id,
            email: users.email,
            timestamp: new Date().toISOString()
          }
        );
        throw new UnauthorizedError('Your vendor account information is incomplete.');
      }

      logger.debug(`[${requestId}] 📋 Vendor Record Found`, {
        vendorId: users.vendor_id,
        vendorStatus: vendor.status,
        vendorName: vendor.name
      });

      if (vendor.status !== 'ACTIVE') {
        logger.warn(`[${requestId}] ⚠️  AUTHORIZATION FAILED - Vendor Not Approved`, {
          userId: users.id,
          vendorId: users.vendor_id,
          email: users.email,
          vendorStatus: vendor.status,
          vendorName: vendor.name,
          reason: `Vendor status is ${vendor.status}, expected ACTIVE`,
          timestamp: new Date().toISOString()
        });
        throw new UnauthorizedError('Your vendor account is pending approval or has been rejected.');
      }

      logger.debug(`[${requestId}] ✅ Vendor Approval Status Verified - ACTIVE`, {
        userId: users.id,
        vendorId: users.vendor_id,
        vendorName: vendor.name
      });
    }

    // JWT Token Generation
    logger.debug(`[${requestId}] 🎟️  Generating JWT Token`, {
      userId: users.id,
      email: users.email,
      role: users.role,
      expiresIn: config.jwt.expiresIn
    });

    const token = jwt.sign(
      {
        id: users.id,
        email: users.email,
        role: users.role,
        vendor_id: users.vendor_id
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.debug(`[${requestId}] ✅ JWT Token Generated Successfully`, {
      userId: users.id,
      tokenLength: token.length,
      tokenExpiresIn: config.jwt.expiresIn
    });

    const user = {
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      vendor_id: users.vendor_id
    };

    const duration = Date.now() - startTime;
    logger.info(`[${requestId}] ✅ LOGIN SERVICE COMPLETED SUCCESSFULLY`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      vendor_id: user.vendor_id || null,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    // Event Log: Successful Authentication Service
    logger.info(`[${requestId}] 🎯 AUTHENTICATION SERVICE EVENT`, {
      eventType: 'AUTH_SERVICE_SUCCESS',
      userId: user.id,
      email: user.email,
      role: user.role,
      vendorId: user.vendor_id || null,
      processSteps: [
        'User found in database',
        'Password validation passed',
        'Account active status verified',
        user.role === 'VENDOR' ? 'Vendor approval status verified' : 'Admin user verified',
        'JWT token generated'
      ],
      tokenGenerated: true,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    return { user, token };
  } catch (error) {
    const duration = Date.now() - startTime;

    let failureReason = 'UNKNOWN_ERROR';
    let failureStep = 'Unknown step';

    // Categorize the failure reason
    if (error.message.includes('Database error')) {
      failureReason = 'DATABASE_ERROR';
      failureStep = 'User database query';
    } else if (error.message.includes('No user record found')) {
      failureReason = 'USER_NOT_FOUND';
      failureStep = 'User lookup';
    } else if (error.message.includes('Password hash does not match')) {
      failureReason = 'INVALID_PASSWORD';
      failureStep = 'Password validation';
    } else if (error.message.includes('User account has been deactivated')) {
      failureReason = 'ACCOUNT_INACTIVE';
      failureStep = 'Account status verification';
    } else if (error.message.includes('Vendor')) {
      failureReason = 'VENDOR_ISSUE';
      failureStep = 'Vendor verification';
    }

    if (error instanceof UnauthorizedError) {
      logger.warn(`[${requestId}] ⚠️  AUTHORIZATION ERROR`, error, {
        email,
        errorMessage: error.message,
        duration: `${duration}ms`
      });

      // Event Log: Service-Level Authorization Failure
      logger.warn(`[${requestId}] 🎯 AUTHENTICATION SERVICE EVENT - FAILURE`, error, {
        eventType: 'AUTH_SERVICE_FAILED',
        email,
        failureReason,
        failureStep,
        errorMessage: error.message,
        duration: `${duration}ms`,
        tokenGenerated: false,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error(
        `[${requestId}] ❌ UNEXPECTED ERROR IN LOGIN SERVICE`,
        error,
        {
          email,
          errorMessage: error.message,
          errorName: error.name,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      );

      // Event Log: Service-Level Unexpected Error
      logger.error(
        `[${requestId}] 🎯 AUTHENTICATION SERVICE EVENT - ERROR`,
        error,
        {
          eventType: 'AUTH_SERVICE_ERROR',
          email,
          failureReason: 'UNEXPECTED_ERROR',
          failureStep,
          errorMessage: error.message,
          errorName: error.name,
          duration: `${duration}ms`,
          tokenGenerated: false,
          timestamp: new Date().toISOString()
        }
      );
    }

    throw error;
  }
}
