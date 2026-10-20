import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { isAuthenticated } from './services/auth';

vi.mock('./services/auth', () => ({ isAuthenticated: vi.fn() }));
vi.mock('./components/MarketTicker', () => ({ default: () => null }));
vi.mock('./pages/Login', () => ({ default: () => <p>Login</p> }));
vi.mock('./pages/Dashboard', () => ({ default: () => <p>Dashboard</p> }));
vi.mock('./pages/Carteiras', () => ({ default: () => <p>Carteira protegida</p> }));
vi.mock('./pages/Corretoras', () => ({ default: () => <p>Corretoras</p> }));
vi.mock('./pages/Acoes', () => ({ default: () => <p>Acoes</p> }));

describe('protecao de rotas', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('redireciona usuarios nao autenticados para login', async () => {
        window.location.hash = '#/carteiras';
        isAuthenticated.mockReturnValue(false);
        render(<App />);
        expect(await screen.findByText('Login')).toBeInTheDocument();
        expect(screen.queryByText('Carteira protegida')).not.toBeInTheDocument();
    });

    it('permite acesso autenticado a carteira', async () => {
        window.location.hash = '#/carteiras';
        isAuthenticated.mockReturnValue(true);
        render(<App />);
        expect(await screen.findByText('Carteira protegida')).toBeInTheDocument();
    });

    it('redireciona usuario autenticado do login para o dashboard', async () => {
        window.location.hash = '#/login';
        isAuthenticated.mockReturnValue(true);
        render(<App />);
        expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    });
});
