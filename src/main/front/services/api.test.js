import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiFetch, apiUrl } from './api';
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
    fetch.mockResolvedValue({ status: 401 });
    await apiFetch('/acoes');
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
});

it('nao envia token de uma sessao corrompida', async () => {
    localStorage.setItem(AUTH_STORAGE_KEY, '{');
    fetch.mockResolvedValue({ status: 200 });
    await apiFetch('/acoes');
    expect(fetch.mock.calls[0][1].headers.has('Authorization')).toBe(false);
});
