/**
 * API Configuration
 * Dynamically determines the API base URL based on environment
 */

import { logger } from "../utils/logger";

// Get the API base URL from environment variables or determine dynamically
const getApiBaseUrl = () => {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Development environment
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_API_URL || "http://localhost:3001";
  }

  // Production environment - use same origin (relative URL)
  // This works when frontend and backend are served from same domain
  if (import.meta.env.VITE_USE_RELATIVE_API_URL === "true") {
    return "";
  }

  // Production environment - use explicit API URL
  return import.meta.env.VITE_API_URL || `${window.location.origin}`;
};

export const API_BASE_URL = getApiBaseUrl();

logger.info("API Configuration Loaded", {
  API_BASE_URL,
  isDev: import.meta.env.DEV,
});

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const startTime = performance.now();
  const requestId = Math.random().toString(36).substring(7);

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  try {
    logger.debug(`[${requestId}] API Request Started`, {
      method: options.method || "GET",
      endpoint,
      fullUrl,
      hasToken: !!token,
    });

    const response = await fetch(fullUrl, config);
    const duration = (performance.now() - startTime).toFixed(2);

    logger.debug(`[${requestId}] API Response Received`, {
      status: response.status,
      duration: `${duration}ms`,
    });

    if (!response.ok) {
      let errorMessage = "Request failed";
      let errorData = null;

      try {
        errorData = await response.json();
        errorMessage =
          errorData.error?.message || errorData.message || errorMessage;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Handle 401 Unauthorized - Token expired or invalid
      if (response.status === 401) {
        logger.warn(
          `[${requestId}] Token expired/invalid - Checking if immediate logout needed`,
          {
            status: response.status,
            endpoint,
            fullUrl,
            duration: `${duration}ms`,
          },
        );

        // Only logout if this is not a login endpoint and token is actually expired
        const token = localStorage.getItem("token");
        const isLoginEndpoint = endpoint.includes("/auth/login");

        if (!isLoginEndpoint && token) {
          try {
            // Check if token is actually expired
            const payload = JSON.parse(atob(token.split(".")[1]));
            const currentTime = Date.now() / 1000;
            const bufferTime = 5 * 60; // 5 minutes buffer

            if (payload.exp < currentTime + bufferTime) {
              logger.warn(
                `[${requestId}] Token confirmed expired - Logging out user`,
              );
              // Clear stored authentication data
              localStorage.removeItem("user");
              localStorage.removeItem("token");

              // Only redirect if we're not already on login page
              if (window.location.pathname !== "/login") {
                window.location.href = "/login";
              }
              throw new Error("Session expired. Please login again.");
            } else {
              logger.info(`[${requestId}] Token still valid - Not logging out`);
            }
          } catch (parseError) {
            logger.error(
              `[${requestId}] Error parsing token during 401 check`,
              parseError,
            );
            // Clear stored authentication data
            localStorage.removeItem("user");
            localStorage.removeItem("token");

            // Only redirect if we're not already on login page
            if (window.location.pathname !== "/login") {
              window.location.href = "/login";
            }
          }
        }

        throw new Error(errorMessage);
      }

      logger.error(
        `[${requestId}] API Request Failed`,
        new Error(errorMessage),
        {
          status: response.status,
          statusText: response.statusText,
          endpoint,
          fullUrl,
          errorData,
          duration: `${duration}ms`,
        },
      );

      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      logger.debug(`[${requestId}] API Request Completed (No Content)`, {
        duration: `${duration}ms`,
      });
      return null;
    }

    const data = await response.json();
    logger.debug(`[${requestId}] API Request Completed Successfully`, {
      duration: `${duration}ms`,
      hasData: !!data,
    });

    return data;
  } catch (error) {
    const duration = (performance.now() - startTime).toFixed(2);

    // Distinguish between network errors and other errors
    if (error instanceof TypeError) {
      logger.error(
        `[${requestId}] Network Error - Backend Not Reachable`,
        error,
        {
          endpoint,
          fullUrl,
          errorType: "NetworkError",
          duration: `${duration}ms`,
          possibleCause:
            "Backend server is not responding or not accessible from this URL",
        },
      );
      throw new Error(
        `Unable to connect to server: ${API_BASE_URL}. Please check if the backend is running.`,
      );
    }

    logger.error(`[${requestId}] API Request Error`, error, {
      endpoint,
      fullUrl,
      duration: `${duration}ms`,
    });

    throw error;
  }
}

export const api = {
  auth: {
    login: (credentials) =>
      apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
  },

  admin: {
    getDashboardStats: () => apiRequest("/api/v1/admin/dashboard/stats"),
    getAllHistory: () => apiRequest("/api/v1/admin/history"),
    getPos: (params) => {
      // Manually build query string to avoid URLSearchParams encoding issues
      const queryParts = [];

      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (key === "status" && Array.isArray(value)) {
          // Send status as comma-separated values
          queryParts.push(`status=${encodeURIComponent(value.join(","))}`);
        } else if (Array.isArray(value)) {
          // For other arrays, send multiple parameters
          value.forEach((val) =>
            queryParts.push(`${key}=${encodeURIComponent(val)}`),
          );
        } else if (value !== undefined && value !== null && value !== "") {
          queryParts.push(`${key}=${encodeURIComponent(value)}`);
        }
      });

      const query = queryParts.join("&");
      return apiRequest(`/api/v1/admin/pos${query ? `?${query}` : ""}`);
    },
    importPosFromCsv: (csvText) =>
      apiRequest("/api/v1/admin/pos/import", {
        method: "POST",
        body: JSON.stringify({ csv_text: csvText }),
      }),
    getPoById: (id) => apiRequest(`/api/v1/admin/pos/${id}`),
    getPoHistory: (id) => apiRequest(`/api/v1/admin/pos/${id}/history`),
    updatePoPriority: (id, priority) =>
      apiRequest(`/api/v1/admin/pos/${id}/priority`, {
        method: "PUT",
        body: JSON.stringify({ priority }),
      }),
    updatePoClosure: (id, closureData) =>
      apiRequest(`/api/v1/admin/pos/${id}/closure`, {
        method: "PUT",
        body: JSON.stringify(closureData),
      }),
    updateLineItemPriority: (poId, lineItemId, priority) =>
      apiRequest(
        `/api/v1/admin/pos/${poId}/line-items/${lineItemId}/priority`,
        {
          method: "PUT",
          body: JSON.stringify({ priority }),
        },
      ),
    importPoLineItemsFromCsv: (poId, csvText) =>
      apiRequest(`/api/v1/admin/pos/${poId}/line-items/import`, {
        method: "POST",
        body: JSON.stringify({ csv_text: csvText }),
      }),
    getLineItems: (params) => {
      // Manually build query string to avoid URLSearchParams encoding issues
      const queryParts = [];

      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (key === "status" && Array.isArray(value)) {
          // Send status as comma-separated values
          queryParts.push(`status=${encodeURIComponent(value.join(","))}`);
        } else if (Array.isArray(value)) {
          // For other arrays, send multiple parameters
          value.forEach((val) =>
            queryParts.push(`${key}=${encodeURIComponent(val)}`),
          );
        } else if (value !== undefined && value !== null && value !== "") {
          queryParts.push(`${key}=${encodeURIComponent(value)}`);
        }
      });

      const query = queryParts.join("&");
      return apiRequest(`/api/v1/admin/line-items${query ? `?${query}` : ""}`);
    },
    getVendors: (params) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/v1/admin/vendors${query ? `?${query}` : ""}`);
    },
    approveVendor: (id) =>
      apiRequest(`/api/v1/admin/vendors/${id}/approve`, {
        method: "POST",
      }),
    rejectVendor: (id) =>
      apiRequest(`/api/v1/admin/vendors/${id}/reject`, {
        method: "POST",
      }),
    createVendor: (vendorData) =>
      apiRequest("/api/v1/admin/vendors", {
        method: "POST",
        body: JSON.stringify(vendorData),
      }),
    updateVendor: (id, vendorData) =>
      apiRequest(`/api/v1/admin/vendors/${id}`, {
        method: "PUT",
        body: JSON.stringify(vendorData),
      }),
    toggleVendorActiveStatus: (id, isActive) =>
      apiRequest(`/api/v1/admin/vendors/${id}/toggle-active`, {
        method: "PUT",
        body: JSON.stringify({ is_active: isActive }),
      }),
    createVendorUser: (vendorId, userData) =>
      apiRequest(`/api/v1/admin/vendors/${vendorId}/user`, {
        method: "POST",
        body: JSON.stringify(userData),
      }),
  },

  vendor: {
    getDashboardStats: () => apiRequest("/api/v1/vendor/dashboard/stats"),
    getAllHistory: () => apiRequest("/api/v1/vendor/history"),
    getPos: (params) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/v1/vendor/pos${query ? `?${query}` : ""}`);
    },
    getPoById: (id) => apiRequest(`/api/v1/vendor/pos/${id}`),
    getPoHistory: (id) => apiRequest(`/api/v1/vendor/pos/${id}/history`),
    acceptPo: (id, lineItems) =>
      apiRequest(`/api/v1/vendor/pos/${id}/accept`, {
        method: "POST",
        body: JSON.stringify({ line_items: lineItems }),
      }),
    updateLineItemExpectedDate: (poId, lineItemId, date) =>
      apiRequest(
        `/api/v1/vendor/pos/${poId}/line-items/${lineItemId}/expected-delivery-date`,
        {
          method: "PUT",
          body: JSON.stringify({ expected_delivery_date: date }),
        },
      ),
    updateLineItemStatus: (poId, lineItemId, status) =>
      apiRequest(`/api/v1/vendor/pos/${poId}/line-items/${lineItemId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    getLineItems: (params) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/v1/vendor/line-items${query ? `?${query}` : ""}`);
    },
  },

  publicVendorSignup: (vendorData) =>
    apiRequest("/api/v1/public/vendor-signup", {
      method: "POST",
      body: JSON.stringify(vendorData),
    }),
};
