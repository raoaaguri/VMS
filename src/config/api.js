export const API_BASE_URL = 'http://localhost:3001';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Request failed');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  auth: {
    login: (credentials) => apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    })
  },

  admin: {
    getPos: (params) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/admin/pos${query ? `?${query}` : ''}`);
    },
    getPoById: (id) => apiRequest(`/admin/pos/${id}`),
    updatePoPriority: (id, priority) => apiRequest(`/admin/pos/${id}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ priority })
    }),
    updateLineItemPriority: (poId, lineItemId, priority) => apiRequest(
      `/admin/pos/${poId}/line-items/${lineItemId}/priority`,
      {
        method: 'PUT',
        body: JSON.stringify({ priority })
      }
    ),
    getVendors: () => apiRequest('/admin/vendors'),
    createVendor: (vendorData) => apiRequest('/admin/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData)
    }),
    updateVendor: (id, vendorData) => apiRequest(`/admin/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(vendorData)
    }),
    createVendorUser: (vendorId, userData) => apiRequest(`/admin/vendors/${vendorId}/user`, {
      method: 'POST',
      body: JSON.stringify(userData)
    })
  },

  vendor: {
    getPos: (params) => {
      const query = new URLSearchParams(params).toString();
      return apiRequest(`/vendor/pos${query ? `?${query}` : ''}`);
    },
    getPoById: (id) => apiRequest(`/vendor/pos/${id}`),
    acceptPo: (id, lineItems) => apiRequest(`/vendor/pos/${id}/accept`, {
      method: 'POST',
      body: JSON.stringify({ line_items: lineItems })
    }),
    updateLineItemExpectedDate: (poId, lineItemId, date) => apiRequest(
      `/vendor/pos/${poId}/line-items/${lineItemId}/expected-delivery-date`,
      {
        method: 'PUT',
        body: JSON.stringify({ expected_delivery_date: date })
      }
    ),
    updateLineItemStatus: (poId, lineItemId, status) => apiRequest(
      `/vendor/pos/${poId}/line-items/${lineItemId}/status`,
      {
        method: 'PUT',
        body: JSON.stringify({ status })
      }
    )
  }
};
