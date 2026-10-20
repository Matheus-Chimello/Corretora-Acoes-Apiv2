import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Navbar from './Navbar';
import { getCurrentUser, logout } from '../services/auth';

vi.mock('../services/auth', () => ({ getCurrentUser: vi.fn(), logout: vi.fn() }));

describe('menu lateral', () => {
    beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); getCurrentUser.mockReturnValue({ name: 'Matheus' }); });
    afterEach(cleanup);

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
        expect(logout).toHaveBeenCalled();
        expect(screen.getByText('Tela de login')).toBeInTheDocument();
    });
});
