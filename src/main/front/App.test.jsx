import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { AUTH_STORAGE_KEY } from './services/auth';
import { http } from './test/http';

const iniciarSessao = role => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste', role }));

describe('protecao de rotas', () => {
    beforeEach(() => {
        iniciarSessao('USER');
        http.mockImplementation(async (path) => ({ ok: true, json: async () => {
            if (path === '/auth/login') return { token: 'token-admin', role: 'ADMIN', nome: 'Admin de teste' };
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
        expect(http).toHaveBeenCalledWith('/api/mercado/cotacoes', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/carteiras/principal', expect.anything());
    });

    it('permite acesso autenticado a carteira', async () => {
        window.location.hash = '#/carteiras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Minha Carteira' })).toBeInTheDocument();
    });

    it('encerra a sessão e volta ao login quando a API rejeita a conta conectada', async () => {
        http.mockImplementation(async (rota) => rota === '/api/dashboard/corretoras'
            ? Response.json({ status: 401, error: 'Unauthorized' }, { status: 401 })
            : Response.json([]));
        window.location.hash = '#/corretoras';
        render(<App />);

        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/login');
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou ou é inválida. Faça login novamente.');
    });

    it('volta ao login em uma segunda aba quando a sessão compartilhada é encerrada', async () => {
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();

        const sessao = localStorage.getItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        fireEvent(window, new StorageEvent('storage', { key: AUTH_STORAGE_KEY, oldValue: sessao, newValue: null }));

        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
    });

    it('redireciona usuario autenticado do login para o dashboard', async () => {
        window.location.hash = '#/login';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument();
    });

    it('abre o gerenciamento de usuarios para ADMIN', async () => {
        iniciarSessao('ADMIN');
        window.location.hash = '#/admin/usuarios';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/usuarios', expect.anything());
    });

    it('abre o painel de ADMIN apos o login com Corretoras como opcao independente', async () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.hash = '#/login';
        const { container } = render(<App />);
        fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'admin@teste.local' } });
        fireEvent.change(container.querySelector('[name="password"]'), { target: { value: 'senha-ficticia' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

        await screen.findByRole('heading', { name: 'Usuários' });
        const menu = within(screen.getByRole('navigation', { name: 'Menu do administrador' }));
        expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual(['Administração', 'Corretoras']);
        expect(menu.getByRole('link', { name: 'Administração' })).toHaveAttribute('aria-current', 'page');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/stats', expect.anything());
        fireEvent.click(menu.getByRole('link', { name: 'Corretoras' }));
        expect(await screen.findByRole('heading', { name: 'Adicionar Corretora' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Corretoras' })).toHaveAttribute('aria-current', 'page');
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/corretoras', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it.each(['/dashboard', '/carteiras', '/acoes'])('encaminha ADMIN de %s para a Administracao', async (rota) => {
        iniciarSessao('ADMIN');
        window.location.hash = '#' + rota;
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/admin/usuarios');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/stats', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/carteiras/principal', expect.anything());
    });

    it('abre o cadastro quando ADMIN acessa a URL comum de corretoras', async () => {
        iniciarSessao('ADMIN');
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Adicionar Corretora' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/admin/corretoras');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it('permite a consulta de corretoras para USER sem formulario de cadastro', async () => {
        iniciarSessao('USER');
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Adicionar por CNPJ:')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it.each(['/admin/usuarios', '/admin/corretoras'])('nega a URL administrativa %s para USER sem fazer consultas administrativas', async (rota) => {
        iniciarSessao('USER');
        window.location.hash = '#' + rota;
        render(<App />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Esta área é exclusiva para administradores.');
        expect(http).not.toHaveBeenCalledWith('/api/usuarios', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/corretoras', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });
});
