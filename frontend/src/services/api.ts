import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5001') + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('prompt_golf_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch authorization and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token has expired or is invalid, wipe session
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('prompt_golf_token');
      localStorage.removeItem('prompt_golf_user');
      
      // Force page reload only if currently on a protected route to boot back to login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
