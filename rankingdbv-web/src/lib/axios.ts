import axios from 'axios';

export const api = axios.create({
    baseURL: localStorage.getItem('api_url') || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Optional: Redirect to login or dispatch an event
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);
