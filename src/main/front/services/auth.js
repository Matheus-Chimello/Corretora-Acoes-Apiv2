import { apiFetch, apiUrl } from './api';
import { notifyMarketTickerUpdate } from './marketTicker';

export const AUTH_STORAGE_KEY = 'gestaoFinanceiraUser';

const getErrorMessage = async (response, fallbackMessage) => {
    const data = await response.json().catch(() => null);
    return data?.message || data?.detail || fallbackMessage;
};

const saveSession = (user) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    notifyMarketTickerUpdate({ refresh: true });
};

const requestLogin = (email, password) => fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
});

export const login = async (email, password) => {
    const response = await requestLogin(email, password);

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Email ou senha invalidos.'));
    }

    const user = await response.json();
    saveSession(user);
    return user;
};

export const registerUser = async ({ name, email, password, confirmPassword }) => {
    const response = await apiFetch('/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, confirmPassword })
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Nao foi possivel criar a conta.'));
    }

    return response.json();
};

export const logout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    notifyMarketTickerUpdate();
};

export const getCurrentUser = () => {
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);

    if (!storedUser) {
        return null;
    }

    try {
        const user = JSON.parse(storedUser);
        return user?.token ? user : null;
    } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
};

export const isAuthenticated = () => Boolean(getCurrentUser());
