import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://backclub.it/backend/public/api';

/** Timeout in ms: evita richieste appese e UX più reattiva */
const REQUEST_TIMEOUT = 25000;

export const apiClient = axios.create({
    baseURL: API_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: false,
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Con FormData non impostare Content-Type: il browser deve inviare multipart con boundary
        if (config.data instanceof FormData && config.headers) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error: AxiosError) => {
        // Handle 401 Unauthorized - Token expired or invalid
        if (error.response?.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');

            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error('Access forbidden:', error.response.data);
        }

        // Handle 404 Not Found
        if (error.response?.status === 404) {
            const method = error.config?.method?.toUpperCase() ?? 'GET';
            const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
            console.error(`Resource not found: ${method} ${url}`, error.response.data);
        }

        // Handle 422 Validation Error
        if (error.response?.status === 422) {
            console.error('Validation error:', error.response.data);
        }

        // Handle 500 Server Error
        if (error.response?.status === 500) {
            console.error('Server error:', error.response.data);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
