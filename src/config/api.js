/**
 * API Configuration
 * Dynamically determines the API base URL based on environment
 */

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

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Request failed");
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
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
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/api/v1/admin/pos${query ? `?${query}` : ""}`);
    },
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
        }
      ),
    getLineItems: (params) => {
      const query = new URLSearchParams(params).toString();
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
        }
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
