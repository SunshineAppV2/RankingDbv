import axios from 'axios';

export const api = axios.create({
    // Prioritize Env Var, then LocalStorage, then Hardcoded Localhost (SAFE DEFAULT for now)
    // The previous window.location.hostname logic fails on production domain if backend is local
    baseURL: import.meta.env.VITE_API_URL || localStorage.getItem('api_url') || 'http://localhost:3000',
});

import { auth } from './firebase';

api.interceptors.request.use(async (config) => {
    // 1. Try Backend Token (JWT)
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        // 2. Fallback to Firebase (Identity) Token
        const user = auth.currentUser;
        if (user) {
            const fbToken = await user.getIdToken();
            // Note: Backend might reject this if not configured for Firebase Admin, 
            // but we keep it for now as a fallback or for firebase-services.
            // Actually, if we send this to OUR backend and it expects JWT, it fails as 401.
            // But let's keep logic: if we have local token, use it.
            config.headers.Authorization = `Bearer ${fbToken}`;
        }
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
