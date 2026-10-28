import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { AUTH_STORAGE_KEY } from './services/auth';
import { http } from './test/http';

describe('protecao de rotas', () => {
    beforeEach(() => {
        http.mockImplementation(async (path) => ({ ok: true, json: async () => {
            if (path === '/carteiras/principal') return { id: 1, saldoEmConta: 0 };
            if (path.endsWith('/stats')) return { corretorasCount: 0 };
            return [];
        } }));
    });

    it('redireciona usuarios nao autenticados para login', async () => {
        window.location.hash = '#/carteiras';
        localStorage.removeItem(AUTH_STORAGE_KEY);
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Minha Carteira' })).not.toBeInTheDocument();
        expect(http).not.toHaveBeenCalled();
    });

    it('permite acesso autenticado a carteira', async () => {
        window.location.hash = '#/carteiras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Minha Carteira' })).toBeInTheDocument();
    });

    it('redireciona usuario autenticado do login para o dashboard', async () => {
        window.location.hash = '#/login';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument();
    });
});
