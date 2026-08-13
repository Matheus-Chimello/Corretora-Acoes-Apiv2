import { AUTH_STORAGE_KEY } from './auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const apiUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const getSessionToken = () => {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY))?.token || null;
    } catch (error) {
        return null;
    }
};

export const apiFetch = async (path, options = {}) => {
    const token = getSessionToken();
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(apiUrl(path), {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    return response;
};
