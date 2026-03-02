/**
 * API Service
 * Centralized fetch wrapper with JWT auth headers and error handling.
 */
const API_BASE = '/api';

/**
 * Get the stored JWT token.
 */
const getToken = () => localStorage.getItem('token');

/**
 * Make an authenticated API request.
 * @param {string} endpoint  e.g. '/auth/login'
 * @param {object} options   fetch options
 * @returns {Promise<object>} parsed JSON response
 */
const request = async (endpoint, options = {}) => {
    const token = getToken();

    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
        ...options,
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
        delete config.headers['Content-Type'];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        // If token expired, clear auth
        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

// ─── Convenience Methods ───

const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),

    post: (endpoint, body) =>
        request(endpoint, { method: 'POST', body: JSON.stringify(body) }),

    put: (endpoint, body) =>
        request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

    patch: (endpoint, body) =>
        request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

    delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};

// ─── Auth Endpoints ───

export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/me'),
};

// ─── District Endpoints ───

export const districtAPI = {
    getAll: (params = '') => api.get(`/districts?${params}`),
    getById: (id) => api.get(`/districts/${id}`),
    getTaluks: (districtId) => api.get(`/districts/${districtId}/taluks`),
};

// ─── Ration Shop Endpoints ───

export const shopAPI = {
    getAll: (params = '') => api.get(`/ration-shops?${params}`),
    getById: (id) => api.get(`/ration-shops/${id}`),
    create: (data) => api.post('/ration-shops', data),
    update: (id, data) => api.put(`/ration-shops/${id}`, data),
};

// ─── Ration Card Endpoints ───

export const cardAPI = {
    getAll: (params = '') => api.get(`/ration-cards?${params}`),
    getById: (id) => api.get(`/ration-cards/${id}`),
    create: (data) => api.post('/ration-cards', data),
    update: (id, data) => api.put(`/ration-cards/${id}`, data),
};

// ─── Commodity Endpoints ───

export const commodityAPI = {
    getAll: () => api.get('/commodities'),
    getById: (id) => api.get(`/commodities/${id}`),
};

// ─── Shop Stock Endpoints ───

export const stockAPI = {
    get: (params = '') => api.get(`/shop-stock?${params}`),
    upsert: (data) => api.post('/shop-stock', data),
};

// ─── Token Endpoints ───

export const tokenAPI = {
    getAll: (params = '') => api.get(`/tokens?${params}`),
    getById: (id) => api.get(`/tokens/${id}`),
    book: (data) => api.post('/tokens/book', data),
    updateStatus: (id, data) => api.patch(`/tokens/${id}/status`, data),
};

// ─── IVR Endpoints ───

export const ivrAPI = {
    incoming: (data) => api.post('/ivr/incoming', data),
    getCallLogs: (params = '') => api.get(`/ivr/call-logs?${params}`),
};

// ─── User Endpoints ───

export const userAPI = {
    getAll: (params = '') => api.get(`/users?${params}`),
    update: (id, data) => api.patch(`/users/${id}`, data),
};

// ─── Audit Endpoints ───

export const auditAPI = {
    getLogs: (params = '') => api.get(`/audit-logs?${params}`),
};

export default api;
