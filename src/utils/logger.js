/**
 * Frontend Logger Utility
 * Provides consistent logging across the frontend application
 * 
 * SECURITY: Sensitive data is NOT logged to console
 * Only meaningful messages are displayed to prevent information disclosure
 */

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

const LOG_COLORS = {
  DEBUG: '#7C3AED',    // Violet
  INFO: '#3B82F6',     // Blue
  WARN: '#F59E0B',     // Amber
  ERROR: '#EF4444'     // Red
};

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.isDevelopment = process.env.NODE_ENV === 'development' || !import.meta.env.PROD;
    // Debug flag for detailed logging (development only)
    this.showDetailedLogs = this.isDevelopment && window.__DEBUG_LOGS === true;
  }

  /**
   * Format log message with timestamp and context
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  /**
   * Check if data contains sensitive information
   */
  hasSensitiveData(data) {
    if (!data) return false;
    
    const sensitiveKeys = ['email', 'password', 'token', 'id', 'userId', 'vendor_id', 'vendorId'];
    
    if (typeof data === 'object') {
      return sensitiveKeys.some(key => key in data);
    }
    
    return false;
  }

  /**
   * Remove sensitive data from logging
   */
  filterSensitiveData(data) {
    if (!data) return null;
    if (!this.hasSensitiveData(data)) return data;
    
    // If detailed logs are enabled in development, show data
    if (this.showDetailedLogs) {
      return data;
    }
    
    // Otherwise, return null (don't show data)
    return null;
  }

  /**
   * Log info level messages (without sensitive data)
   */
  info(message, data = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.INFO, message);
    const filteredData = this.filterSensitiveData(data);
    console.log(`%c${formattedMessage}`, `color: ${LOG_COLORS.INFO}; font-weight: bold;`, filteredData || '');
  }

  /**
   * Log error level messages (without sensitive data)
   */
  error(message, error = null, data = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.ERROR, message);
    const filteredData = this.filterSensitiveData(data);
    
    // Only show error message, not error object (prevents stack trace exposure)
    const errorMessage = error?.message || 'Unknown error';
    console.error(`%c${formattedMessage}`, `color: ${LOG_COLORS.ERROR}; font-weight: bold;`, errorMessage);
    
    if (filteredData) {
      console.error('  Details:', filteredData);
    }
  }

  /**
   * Log warning level messages (without sensitive data)
   */
  warn(message, data = null) {
    const formattedMessage = this.formatMessage(LOG_LEVELS.WARN, message);
    const filteredData = this.filterSensitiveData(data);
    console.warn(`%c${formattedMessage}`, `color: ${LOG_COLORS.WARN}; font-weight: bold;`, filteredData || '');
  }

  /**
   * Log debug level messages (only in development, with detailed data)
   */
  debug(message, data = null) {
    if (!this.isDevelopment) return;
    const formattedMessage = this.formatMessage(LOG_LEVELS.DEBUG, message);
    
    // Debug logs show more details (only in development mode)
    if (this.showDetailedLogs) {
      console.log(`%c${formattedMessage}`, `color: ${LOG_COLORS.DEBUG}; font-weight: bold;`, data || '');
    } else {
      // Production-safe debug (message only)
      console.log(`%c${formattedMessage}`, `color: ${LOG_COLORS.DEBUG}; font-weight: bold;`);
    }
  }

  /**
   * Send logs to backend for persistence
   * (Backend receives sensitive data, frontend console does not)
   */
  sendToServer(level, message, data) {
    // This could send logs to backend for monitoring
    // Backend logging is safe - only server-side logs will have sensitive data
    // Uncomment if backend has /api/v1/logs endpoint
    /*
    try {
      navigator.sendBeacon('/api/v1/logs', JSON.stringify({
        level,
        message,
        context: this.context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        data // Server-side only, safe
      }));
    } catch (err) {
      // Silently fail - logging shouldn't break the app
    }
    */
  }

  /**
   * Create a child logger with a specific context
   */
  child(context) {
    return new Logger(`${this.context}:${context}`);
  }
}

// Create root logger instance
export const logger = new Logger('AUTH');

// Export Logger class for creating contextual loggers
export default Logger;
