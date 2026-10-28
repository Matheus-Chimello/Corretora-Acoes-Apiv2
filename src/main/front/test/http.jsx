import React from 'react';
import { beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render as testingRender } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AUTH_STORAGE_KEY } from '../services/auth';
import { MARKET_TICKER_UPDATED_EVENT } from '../services/marketTicker';

// Doubles live at browser boundaries; application modules stay real.
export const http = vi.fn();
export const marketUpdates = vi.fn();

beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste', nome: 'Pessoa de teste', role: 'ADMIN' }));
    http.mockReset();
    marketUpdates.mockReset();
    vi.stubGlobal('fetch', vi.fn((url, options) => http(new URL(url, window.location.origin).pathname, options)));
    window.addEventListener(MARKET_TICKER_UPDATED_EVENT, marketUpdates);
});

afterEach(() => {
    cleanup();
    window.removeEventListener(MARKET_TICKER_UPDATED_EVENT, marketUpdates);
    vi.unstubAllGlobals();
    localStorage.clear();
});

export function renderWithRouter(ui, options) {
    return testingRender(ui, { wrapper: MemoryRouter, ...options });
}
