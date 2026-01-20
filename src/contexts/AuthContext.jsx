import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../config/api';
import { logger as baseLogger } from '../utils/logger';

const AuthContext = createContext(null);
const logger = baseLogger.child('AuthContext');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.info('🔄 Initializing Auth Provider - Checking for stored session');

    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        logger.info('✅ Session restored from localStorage', {
          userId: parsedUser.id,
          email: parsedUser.email,
          role: parsedUser.role
        });
      } else {
        logger.info('ℹ️  No existing session found - User needs to login');
      }
    } catch (error) {
      logger.error('❌ Error restoring session from localStorage', error, {
        storedUserExists: !!localStorage.getItem('user'),
        storedTokenExists: !!localStorage.getItem('token')
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const loginStartTime = performance.now();
    const requestId = Math.random().toString(36).substring(7);

    logger.info(`[${requestId}] 🔐 Login Attempt Started`, {
      email: email,
      timestamp: new Date().toISOString()
    });

    try {
      logger.debug(`[${requestId}] Sending credentials to backend`, {
        email,
        passwordProvided: !!password,
        endpoint: '/api/v1/auth/login'
      });

      const response = await api.auth.login({ email, password });

      logger.debug(`[${requestId}] ✅ Backend Login Response Received`, {
        userIdReturned: !!response.user?.id,
        tokenReturned: !!response.token,
        userRole: response.user?.role
      });

      // Validate response structure
      if (!response.user || !response.token) {
        throw new Error('Invalid response from server: missing user or token');
      }

      // Store in localStorage
      try {
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('token', response.token);
        logger.debug(`[${requestId}] 💾 User and token stored in localStorage`);
      } catch (storageError) {
        logger.error(
          `[${requestId}] ❌ Failed to store credentials in localStorage`,
          storageError,
          { storageQuotaExceeded: storageError.name === 'QuotaExceededError' }
        );
        throw new Error('Failed to save login session. Storage may be full.');
      }

      // Update React state
      setUser(response.user);

      const duration = (performance.now() - loginStartTime).toFixed(2);
      logger.info(`[${requestId}] ✅ Login Successful`, {
        userId: response.user.id,
        email: response.user.email,
        role: response.user.role,
        vendor_id: response.user.vendor_id || null,
        duration: `${duration}ms`
      });

      return response.user;
    } catch (error) {
      const duration = (performance.now() - loginStartTime).toFixed(2);

      // Categorize the error
      let errorCategory = 'UnknownError';
      let possibleCauses = [];

      if (error.message.includes('Unable to connect')) {
        errorCategory = 'NetworkError';
        possibleCauses = [
          'Backend server is not running',
          'Incorrect API URL configuration',
          'Network connectivity issue',
          'CORS policy blocking the request'
        ];
      } else if (error.message.includes('Invalid email or password')) {
        errorCategory = 'AuthenticationError';
        possibleCauses = ['Email or password is incorrect', 'Account does not exist'];
      } else if (error.message.includes('not active')) {
        errorCategory = 'AccountStatusError';
        possibleCauses = ['Account has been deactivated by administrator'];
      } else if (error.message.includes('pending approval')) {
        errorCategory = 'VendorApprovalError';
        possibleCauses = ['Vendor account is still pending approval', 'Vendor account has been rejected'];
      } else if (error.message.includes('storage')) {
        errorCategory = 'StorageError';
        possibleCauses = ['Browser storage is full', 'Browser storage is disabled'];
      }

      logger.error(
        `[${requestId}] ❌ Login Failed - ${errorCategory}`,
        error,
        {
          email,
          errorMessage: error.message,
          errorCategory,
          possibleCauses,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        }
      );

      throw error;
    }
  };

  const logout = () => {
    const requestId = Math.random().toString(36).substring(7);

    try {
      logger.info(`[${requestId}] 🚪 Logout Initiated`, {
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString()
      });

      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);

      logger.info(`[${requestId}] ✅ Logout Successful - Session cleared from localStorage`);
    } catch (error) {
      logger.error(`[${requestId}] ❌ Error during logout`, error);
      // Still clear the state even if localStorage cleanup fails
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    logger.error('❌ useAuth Hook Error', new Error('AuthContext not found'));
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
