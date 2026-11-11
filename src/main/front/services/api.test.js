import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch, apiUrl, getErrorMessage } from './api';
import { AUTH_STORAGE_KEY } from './auth';

beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

it('normaliza caminhos e envia o token sem perder outros cabecalhos', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste' }));
    fetch.mockResolvedValue({ status: 200 });
    await apiFetch('acoes', { headers: { 'Content-Type': 'application/json' } });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe(apiUrl('/acoes'));
    expect(options.headers.get('Authorization')).toBe('Bearer token-teste');
    expect(options.headers.get('Content-Type')).toBe('application/json');
});

it('remove sessao quando a API retorna nao autorizado', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'expirado' }));
    fetch.mockResolvedValue(Response.json({}, { status: 401 }));
    await apiFetch('/acoes');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
});

it('mantém a sessão quando a falha 401 vem de uma API externa', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-atual' }));
    fetch.mockResolvedValue(Response.json({
        error: 'External API Error', message: 'Falha de autenticação na fonte de cotações.'
    }, { status: 401 }));
    const response = await apiFetch('/acoes/atualizar-cotacoes', { method: 'PUT' });
    expect(await getErrorMessage(response, 'Falha na consulta.')).toBe('Falha de autenticação na fonte de cotações.');
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)).token).toBe('token-atual');
});

it('mantém a sessão nova se uma resposta atrasada rejeitar o token anterior', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-anterior' }));
    let concluir;
    fetch.mockImplementation(() => new Promise(resolve => { concluir = resolve; }));
    const requisicaoAnterior = apiFetch('/acoes');
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-atual' }));
    concluir(Response.json({}, { status: 401 }));
    await requisicaoAnterior;
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)).token).toBe('token-atual');
});

it('nao envia token de uma sessao corrompida', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{');
    fetch.mockResolvedValue({ status: 200 });
    await apiFetch('/acoes');
    expect(fetch.mock.calls[0][1].headers.has('Authorization')).toBe(false);
});
