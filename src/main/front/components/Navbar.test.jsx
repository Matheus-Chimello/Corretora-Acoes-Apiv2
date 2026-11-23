import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import { AUTH_STORAGE_KEY, isAuthenticated } from '../services/auth';
import '../test/http';

describe('menu lateral', () => {
    beforeEach(() => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'jwt-teste', name: 'Matheus' })));

    it('mostra o menu e a pagina inicial de cada perfil', () => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'jwt-admin', role: 'ADMIN' }));
        const admin = render(<MemoryRouter><Navbar title="Carteira" /></MemoryRouter>);
        const menuAdmin = within(screen.getByRole('navigation', { name: 'Menu do administrador' }));
        expect(menuAdmin.getAllByRole('link').map(link => link.textContent)).toEqual(['Administração', 'Corretoras']);
        expect(menuAdmin.getByRole('link', { name: 'Administração' })).toHaveAttribute('href', '/admin/usuarios');
        expect(menuAdmin.getByRole('link', { name: 'Corretoras' })).toHaveAttribute('href', '/admin/corretoras');
        expect(screen.getByRole('link', { name: 'Ir para a administração' })).toHaveAttribute('href', '/admin/usuarios');
        admin.unmount();
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'jwt-user', role: 'USER' }));
        render(<MemoryRouter><Navbar title="Carteira" /></MemoryRouter>);
        const menuUsuario = within(screen.getByRole('navigation', { name: 'Menu principal' }));
        expect(menuUsuario.getAllByRole('link').map(link => link.textContent)).toEqual(['Visão geral', 'Carteira', 'Resumo mensal', 'Corretoras', 'Ações']);
        expect(menuUsuario.getByRole('link', { name: 'Corretoras' })).toHaveAttribute('href', '/corretoras');
    });

    it('recolhe e expande o menu e salva a preferencia', () => {
        render(<MemoryRouter><Navbar title="Carteira" /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: 'Recolher menu lateral' }));
        expect(localStorage.getItem('sidebar-recolhida')).toBe('true');
        expect(document.body).toHaveClass('sidebar-is-collapsed');
        const titulo = screen.getByRole('heading', { name: 'Carteira', level: 1 });
        expect(screen.getByRole('banner')).not.toContainElement(titulo);
        fireEvent.click(screen.getByRole('button', { name: 'Expandir menu lateral' }));
        expect(localStorage.getItem('sidebar-recolhida')).toBe('false');
    });

    it('encerra a sessao e retorna ao login', () => {
        render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<Navbar title="Carteira" />} /><Route path="/login" element={<p>Tela de login</p>} /></Routes></MemoryRouter>);
        expect(screen.getByText('Matheus')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
        expect(isAuthenticated()).toBe(false);
        expect(screen.getByText('Tela de login')).toBeInTheDocument();
    });
});
