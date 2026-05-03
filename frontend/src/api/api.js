import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log(`[API Interceptor] Request to ${config.url}. Token in localStorage: ${token ? 'YES' : 'NO'}`);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`[API Interceptor] Authorization header added`);
    } else {
      console.warn(`[API Interceptor] NO TOKEN FOUND IN LOCALSTORAGE for request: ${config.url}`);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
