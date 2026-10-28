import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from './Login';
import { AUTH_STORAGE_KEY, getCurrentUser } from '../services/auth';
import { http } from '../test/http';

const abrir = () => render(<MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<p>Página inicial</p>} />
</Routes></MemoryRouter>);

describe('tela de acesso', () => {
    it('entra com as credenciais e navega para a pagina inicial', async () => {
        http.mockResolvedValue({ ok: true, status: 200, json: async () => ({ token: 'jwt-teste', email: 'pessoa@teste.local' }) });
        const { container } = abrir();
        fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'pessoa@teste.local' } });
        fireEvent.change(container.querySelector('[name="password"]'), { target: { value: 'senha123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
        expect(await screen.findByText('Página inicial')).toBeInTheDocument();
        expect(getCurrentUser()).toEqual({ token: 'jwt-teste', email: 'pessoa@teste.local' });
        expect(http).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
            body: JSON.stringify({ email: 'pessoa@teste.local', password: 'senha123' })
        }));
    });

    it('mostra erro de login sem navegar', async () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        http.mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Senha invalida' }) });
        abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
        expect(await screen.findByText('Senha invalida')).toBeInTheDocument();
        expect(screen.queryByText('Página inicial')).not.toBeInTheDocument();
        expect(getCurrentUser()).toBeNull();
    });

    it('reserva o cadastro de usuarios a administracao', () => {
        abrir();
        expect(screen.queryByRole('button', { name: 'Cadastre-se' })).not.toBeInTheDocument();
        expect(screen.getByText('Solicite seu acesso ao administrador.')).toBeInTheDocument();
    });
});
