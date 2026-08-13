import { apiUrl } from './api';

export const AUTH_STORAGE_KEY = 'gestaoFinanceiraUser';
const LEGACY_USERS_STORAGE_KEY = 'gestaoFinanceiraRegisteredUsers';

const getErrorMessage = async (response, fallbackMessage) => {
    const data = await response.json().catch(() => null);
    return data?.message || data?.detail || fallbackMessage;
};

const saveSession = (user) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
};

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const requestLogin = (email, password) => fetch(apiUrl('/auth/login'), {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
});

const migrateLegacyUser = async (email, password) => {
    try {
        const legacyUsers = JSON.parse(localStorage.getItem(LEGACY_USERS_STORAGE_KEY) || '[]');
        const legacyUser = Array.isArray(legacyUsers)
            ? legacyUsers.find((user) => normalizeEmail(user.email) === normalizeEmail(email) && user.password === password)
            : null;

        if (!legacyUser) {
            return false;
        }

        const response = await fetch(apiUrl('/auth/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: legacyUser.name,
                email: legacyUser.email,
                password,
                confirmPassword: password
            })
        });

        if (!response.ok) {
            return false;
        }

        localStorage.setItem(
            LEGACY_USERS_STORAGE_KEY,
            JSON.stringify(legacyUsers.filter((user) => normalizeEmail(user.email) !== normalizeEmail(email)))
        );
        return true;
    } catch (error) {
        return false;
    }
};

export const login = async (email, password) => {
    let response = await requestLogin(email, password);

    if (response.status === 401 && await migrateLegacyUser(email, password)) {
        response = await requestLogin(email, password);
    }

    if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Email ou senha invalidos.'));
    }

    const user = await response.json();
    saveSession(user);
    return user;
};

export const registerUser = async ({ name, email, password, confirmPassword }) => {
    const response = await fetch(apiUrl('/auth/register'), {
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
    const currentUser = getCurrentUser();
    localStorage.removeItem(AUTH_STORAGE_KEY);

    if (!currentUser?.token) {
        return;
    }

    fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${currentUser.token}`
        }
    }).catch(() => undefined);
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

export const hasRole = (role) => getCurrentUser()?.role === role;
