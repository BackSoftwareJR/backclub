import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Production: backclub.it
    if (window.location.hostname === 'backclub.it' || window.location.hostname.includes('backclub.it')) {
        return 'https://backclub.it/backend/public/api';
    }
    // Development: localhost
    return 'http://localhost:8000/api';
};

const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for Sanctum cookie-based auth if used, or just good practice
});

// Add a request interceptor to add the token to headers
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/#/login';
        }
        return Promise.reject(error);
    }
);

export default api;
