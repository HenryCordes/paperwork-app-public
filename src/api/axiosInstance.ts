import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Create a configurable axios instance that can be used throughout the app
 */
export const createAxiosInstance = (config?: AxiosRequestConfig): AxiosInstance => {
  const apiUrl = import.meta.env.VITE_PAPERWORK_API_URL || '';
  
  const instance = axios.create({
    baseURL: apiUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  });
  
  // Request interceptor - can be used to add auth tokens etc.
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Response interceptor - handle common error cases
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Handle 401 Unauthorized errors by clearing the token
      if (error.response?.status === 401) {
        // Clear the invalid token
        try {
          localStorage.removeItem('authToken');
          console.log('[Axios] Cleared invalid token due to 401 response');
          
          // We don't redirect here to avoid circular redirects
          // App.tsx will handle redirection on the next render
        } catch (e) {
          console.error('[Axios] Error removing token after 401:', e);
        }
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

// Default pre-configured axios instance
export const axiosInstance = createAxiosInstance();

export default axiosInstance;
