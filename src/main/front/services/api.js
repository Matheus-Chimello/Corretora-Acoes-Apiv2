import { AUTH_STORAGE_KEY } from './auth';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const sameOriginApiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';

export const API_BASE_URL = (configuredApiBaseUrl || sameOriginApiBaseUrl).replace(/\/+$/, '');

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
