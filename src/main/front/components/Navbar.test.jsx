import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import { AUTH_STORAGE_KEY, isAuthenticated } from '../services/auth';
import '../test/http';

describe('menu lateral', () => {
    beforeEach(() => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'jwt-teste', name: 'Matheus' })));

    it('recolhe e expande o menu e salva a preferencia', () => {
        render(<MemoryRouter><Navbar title="Carteira" /></MemoryRouter>);
        fireEvent.click(screen.getByRole('button', { name: 'Recolher menu lateral' }));
        expect(localStorage.getItem('sidebar-recolhida')).toBe('true');
        expect(document.body).toHaveClass('sidebar-is-collapsed');
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
