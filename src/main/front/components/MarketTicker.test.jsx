import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MarketTicker from './MarketTicker';
import { http } from '../test/http';
import { AUTH_STORAGE_KEY } from '../services/auth';
import { notifyMarketTickerUpdate } from '../services/marketTicker';


describe('carrossel de cotacoes', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('busca as cotacoes ao entrar e reage a atualizacoes', async () => {

        http.mockResolvedValue({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 30, moeda: 'BRL' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('R$ 30,00')).toHaveLength(2);
        expect(http).toHaveBeenCalledWith('/acoes/atualizar-cotacoes', expect.objectContaining({ method: 'PUT' }));
        notifyMarketTickerUpdate();
        await waitFor(() => expect(http).toHaveBeenCalledWith('/acoes', expect.anything()));
        const consulta = http.mock.calls.find(([path]) => path === '/acoes');
        expect(consulta[1].headers.get('Authorization')).toBe('Bearer token-teste');
    });

    it('usa os indicadores padrao sem consultar a API quando nao autenticado', () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        render(<MarketTicker />);
        expect(screen.getAllByText('IBOV')).toHaveLength(2);
        expect(http).not.toHaveBeenCalled();
    });

    it('consulta os valores existentes quando a atualizacao falha', async () => {

        http.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'IBM', cotacaoAtual: 100, moeda: 'USD' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('US$ 100,00')).toHaveLength(2);
        expect(http).toHaveBeenCalledWith('/acoes', expect.anything());
    });
});
