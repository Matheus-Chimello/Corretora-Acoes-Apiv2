import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MarketTicker from './MarketTicker';
import { apiFetch } from '../services/api';
import { isAuthenticated } from '../services/auth';
import { notifyMarketTickerUpdate } from '../services/marketTicker';

vi.mock('../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../services/auth', () => ({ isAuthenticated: vi.fn() }));

describe('carrossel de cotacoes', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('busca as cotacoes ao entrar e reage a atualizacoes', async () => {
        isAuthenticated.mockReturnValue(true);
        apiFetch.mockResolvedValue({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 30, moeda: 'BRL' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('R$ 30,00')).toHaveLength(2);
        expect(apiFetch).toHaveBeenCalledWith('/acoes/atualizar-cotacoes', { method: 'PUT' });
        notifyMarketTickerUpdate();
        await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/acoes'));
    });

    it('usa os indicadores padrao sem consultar a API quando nao autenticado', () => {
        isAuthenticated.mockReturnValue(false);
        render(<MarketTicker />);
        expect(screen.getAllByText('IBOV')).toHaveLength(2);
        expect(apiFetch).not.toHaveBeenCalled();
    });

    it('consulta os valores existentes quando a atualizacao falha', async () => {
        isAuthenticated.mockReturnValue(true);
        apiFetch.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'IBM', cotacaoAtual: 100, moeda: 'USD' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('US$ 100,00')).toHaveLength(2);
        expect(apiFetch).toHaveBeenCalledWith('/acoes');
    });
});
