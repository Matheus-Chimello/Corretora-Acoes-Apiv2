import { AUTH_SESSION_ENDED_MESSAGE, encerrarSessaoInvalida, getCurrentUser } from './auth';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const sameOriginApiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8080';

export const API_BASE_URL = (configuredApiBaseUrl || sameOriginApiBaseUrl).replace(/\/+$/, '');

export const apiUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

const lerErro = async (response) => {
    try {
        return await response.json();
    } catch {
        return null;
    }
};

export const getErrorMessage = async (response, fallback, { login = false } = {}) => {
    if (response.status === 403) {
        return 'Você não tem permissão para realizar esta ação. Entre em contato com o administrador.';
    }
    if (response.status >= 500) {
        return 'O servidor está indisponível no momento. Tente novamente em instantes.';
    }
    const data = await lerErro(response);
    if (response.status === 401 && !login && data?.error !== 'External API Error') {
        return AUTH_SESSION_ENDED_MESSAGE;
    }
    const message = [data?.message, data?.detail].find((value) => typeof value === 'string' && value.trim());
    const fields = Object.values(data?.fields || {}).filter((value) => typeof value === 'string');
    return [message || fallback, ...fields].join(' ');
};

export const CONNECTION_ERROR_MESSAGE = 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';

export const apiFetch = async (path, options = {}) => {
    const token = getCurrentUser()?.token;
    const headers = new Headers(options.headers || {});

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    let response;
    try {
        response = await fetch(apiUrl(path), { ...options, headers });
    } catch {
        throw new Error(CONNECTION_ERROR_MESSAGE);
    }

    if (response.status === 401 && token) {
        const data = await lerErro(response.clone());
        if (data?.error !== 'External API Error') encerrarSessaoInvalida(token);
    }

    return response;
};
