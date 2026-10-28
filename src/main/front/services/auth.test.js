import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, getCurrentUser, isAuthenticated, login, logout, registerUser } from './auth';
import { MARKET_TICKER_UPDATED_EVENT } from './marketTicker';

const updates = [];
const observeUpdate = (event) => updates.push(event.detail);
const resposta = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('autenticacao', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn());
        vi.clearAllMocks();
        updates.length = 0;
        window.addEventListener(MARKET_TICKER_UPDATED_EVENT, observeUpdate);
    });
    afterEach(() => {
        window.removeEventListener(MARKET_TICKER_UPDATED_EVENT, observeUpdate);
        vi.unstubAllGlobals();
    });

    it('guarda a sessao recebida no login e atualiza as cotacoes', async () => {
        const usuario = { nome: 'Pessoa', token: 'token-teste' };
        fetch.mockResolvedValue(resposta(200, usuario));
        expect(await login('pessoa@teste.local', 'senha')).toEqual(usuario);
        expect(getCurrentUser()).toEqual(usuario);
        expect(isAuthenticated()).toBe(true);
        expect(updates).toEqual([{ refresh: true }]);
    });

    it('retorna erro de credenciais sem salvar sessao', async () => {
        fetch.mockResolvedValue(resposta(401, { message: 'Credenciais invalidas' }));
        await expect(login('pessoa@teste.local', 'errada')).rejects.toThrow('Credenciais invalidas');
        expect(isAuthenticated()).toBe(false);
    });

    it('recusa credenciais sem tentar cadastro publico de usuario legado', async () => {
        localStorage.setItem('gestaoFinanceiraRegisteredUsers', JSON.stringify([
            { name: 'Pessoa', email: 'PESSOA@teste.local', password: 'senha' }
        ]));
        fetch.mockResolvedValue(resposta(401, {}));
        await expect(login('pessoa@teste.local', 'senha')).rejects.toThrow('Email ou senha invalidos.');
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(getCurrentUser()).toBeNull();
    });

    it('registra uma conta e informa erros recebidos da API', async () => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-admin', role: 'ADMIN' }));
        const dados = { name: 'Pessoa', email: 'p@teste.local', password: 'senha', confirmPassword: 'senha' };
        fetch.mockResolvedValueOnce(resposta(201, { email: dados.email }));
        expect(await registerUser(dados)).toEqual({ email: dados.email });
        expect(fetch.mock.calls[0][1].headers.get('Authorization')).toBe('Bearer token-admin');
        fetch.mockResolvedValueOnce(resposta(400, { detail: 'Email invalido' }));
        await expect(registerUser(dados)).rejects.toThrow('Email invalido');
    });

    it('remove sessao invalida e encerra sessao existente', () => {
        localStorage.setItem(AUTH_STORAGE_KEY, '{');
        expect(getCurrentUser()).toBeNull();
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste' }));
        fetch.mockResolvedValue(resposta(200, {}));
        logout();
        expect(getCurrentUser()).toBeNull();
        expect(fetch).not.toHaveBeenCalled();
    });
});
