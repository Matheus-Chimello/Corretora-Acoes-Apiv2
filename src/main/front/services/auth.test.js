import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEY, getCurrentUser, isAuthenticated, login, logout, registerUser } from './auth';
import { notifyMarketTickerUpdate } from './marketTicker';

vi.mock('./marketTicker', () => ({ notifyMarketTickerUpdate: vi.fn() }));
const resposta = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('autenticacao', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn());
        vi.clearAllMocks();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('guarda a sessao recebida no login e atualiza as cotacoes', async () => {
        const usuario = { nome: 'Pessoa', token: 'token-teste' };
        fetch.mockResolvedValue(resposta(200, usuario));
        expect(await login('pessoa@teste.local', 'senha')).toEqual(usuario);
        expect(getCurrentUser()).toEqual(usuario);
        expect(isAuthenticated()).toBe(true);
        expect(notifyMarketTickerUpdate).toHaveBeenCalledWith({ refresh: true });
    });

    it('retorna erro de credenciais sem salvar sessao', async () => {
        fetch.mockResolvedValue(resposta(401, { message: 'Credenciais invalidas' }));
        await expect(login('pessoa@teste.local', 'errada')).rejects.toThrow('Credenciais invalidas');
        expect(isAuthenticated()).toBe(false);
    });

    it('migra usuario legado somente com credenciais correspondentes', async () => {
        localStorage.setItem('gestaoFinanceiraRegisteredUsers', JSON.stringify([
            { name: 'Pessoa', email: 'PESSOA@teste.local', password: 'senha' }
        ]));
        fetch.mockResolvedValueOnce(resposta(401, {}))
            .mockResolvedValueOnce(resposta(201, {}))
            .mockResolvedValueOnce(resposta(200, { token: 'novo-token' }));
        await login('pessoa@teste.local', 'senha');
        expect(fetch).toHaveBeenCalledTimes(3);
        expect(JSON.parse(localStorage.getItem('gestaoFinanceiraRegisteredUsers'))).toEqual([]);
        expect(getCurrentUser().token).toBe('novo-token');
    });

    it('registra uma conta e informa erros recebidos da API', async () => {
        const dados = { name: 'Pessoa', email: 'p@teste.local', password: 'senha', confirmPassword: 'senha' };
        fetch.mockResolvedValueOnce(resposta(201, { email: dados.email }));
        expect(await registerUser(dados)).toEqual({ email: dados.email });
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
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/logout'), expect.objectContaining({
            headers: { Authorization: 'Bearer token-teste' }
        }));
    });
});
