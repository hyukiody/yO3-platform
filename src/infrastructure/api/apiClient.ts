import axios from 'axios';

/**
 * Centralized API Client
 * Configured exclusively to point to the API Gateway (Port 8091)
 * Eradicates localized Axios instances and fetch lookups.
 */
const API_GATEWAY_URL = 'http://localhost:8091';

const apiClient = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Implementation: Centralized Ingress & Axios Unification
// Automate the injection of the yo3_token for all authenticated requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('yo3_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Global error interceptor to handle auth failures or gateway issues
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Audit logout/401 here if needed to avoid localized duplication
    if (error.response?.status === 401) {
      // Clear token if it's invalid - following Directive 1 unification
      localStorage.removeItem('yo3_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
