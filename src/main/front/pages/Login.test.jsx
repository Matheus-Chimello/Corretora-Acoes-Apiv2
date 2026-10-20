import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Login from './Login';
import { login, registerUser } from '../services/auth';

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('../services/auth', () => ({ login: vi.fn(), registerUser: vi.fn() }));

describe('tela de acesso', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('entra com as credenciais e navega para a pagina inicial', async () => {
        login.mockResolvedValue({ token: 'teste' });
        const { container } = render(<Login />);
        fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'pessoa@teste.local' } });
        fireEvent.change(container.querySelector('[name="password"]'), { target: { value: 'senha123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
        await waitFor(() => expect(login).toHaveBeenCalledWith('pessoa@teste.local', 'senha123'));
        expect(navigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('mostra erro de login sem navegar', async () => {
        login.mockRejectedValue(new Error('Senha invalida'));
        render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
        expect(await screen.findByText('Senha invalida')).toBeInTheDocument();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('cria conta e volta para o login com o email preenchido', async () => {
        registerUser.mockResolvedValue({});
        const { container } = render(<Login />);
        fireEvent.click(screen.getByRole('button', { name: 'Cadastre-se' }));
        for (const [name, value] of Object.entries({ name: 'Pessoa', email: 'p@teste.local', password: 'senha123', confirmPassword: 'senha123' })) {
            fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { value } });
        }
        fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
        expect(await screen.findByText('Conta criada com sucesso. Entre para continuar.')).toBeInTheDocument();
        expect(container.querySelector('[name="email"]')).toHaveValue('p@teste.local');
        expect(registerUser).toHaveBeenCalledWith({ name: 'Pessoa', email: 'p@teste.local', password: 'senha123', confirmPassword: 'senha123' });
    });
});
