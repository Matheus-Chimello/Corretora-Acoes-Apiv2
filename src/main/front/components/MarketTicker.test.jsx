import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import MarketTicker from './MarketTicker';
import { http } from '../test/http';
import { AUTH_STORAGE_KEY } from '../services/auth';
import { notifyMarketTickerUpdate } from '../services/marketTicker';
import { login, logout } from '../services/auth';
import { act } from '@testing-library/react';


describe('carrossel de cotacoes', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('busca as cotacoes ao entrar e reage a atualizacoes', async () => {

        http.mockResolvedValue({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 30, moeda: 'BRL' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('R$ 30,00')).toHaveLength(2);
        expect(http).toHaveBeenCalledWith('/acoes', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/acoes/atualizar-cotacoes', expect.anything());
        notifyMarketTickerUpdate();
        await waitFor(() => expect(http).toHaveBeenCalledWith('/acoes', expect.anything()));
        const consulta = http.mock.calls.find(([path]) => path === '/acoes');
        expect(consulta[1].headers.get('Authorization')).toBe('Bearer token-teste');
    });

    it('mostra cotacoes publicas na tela de login sem enviar token', async () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        http.mockResolvedValue({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 32, moeda: 'BRL' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('R$ 32,00')).toHaveLength(2);
        expect(http).toHaveBeenCalledWith('/api/mercado/cotacoes', expect.anything());
        expect(http.mock.calls[0][1].headers.has('Authorization')).toBe(false);
        expect(http).not.toHaveBeenCalledWith('/acoes', expect.anything());
    });

    it('mantem os valores existentes e informa indisponibilidade na consulta seguinte', async () => {
        http.mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'IBM', cotacaoAtual: 100, moeda: 'USD' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('US$ 100,00')).toHaveLength(2);
        http.mockResolvedValueOnce(new Response('{}', { status: 503 }));
        notifyMarketTickerUpdate();
        expect(await screen.findByRole('status')).toHaveTextContent('O servidor está indisponível no momento. Tente novamente em instantes.');
        expect(screen.getAllByText('US$ 100,00')).toHaveLength(2);
    });

    it('descarta uma resposta privada atrasada depois de sair da conta', async () => {
        let concluirConsultaPrivada;
        http.mockReturnValueOnce(new Promise((resolve) => { concluirConsultaPrivada = resolve; }))
            .mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 32, moeda: 'BRL' }] });
        render(<MarketTicker />);
        act(() => logout());
        expect(await screen.findAllByText('R$ 32,00')).toHaveLength(2);
        await act(async () => concluirConsultaPrivada({ ok: true, json: async () => [{ ticker: 'IBM', cotacaoAtual: 100, moeda: 'USD' }] }));
        expect(screen.queryByText('US$ 100,00')).not.toBeInTheDocument();
        expect(screen.getAllByText('R$ 32,00')).toHaveLength(2);
    });

    it('mostra o mercado publico quando a conta ainda nao tem acoes', async () => {
        http.mockResolvedValueOnce({ ok: true, json: async () => [] })
            .mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 32, moeda: 'BRL' }] });
        render(<MarketTicker />);
        expect(await screen.findAllByText('R$ 32,00')).toHaveLength(2);
        expect(http).toHaveBeenCalledWith('/api/mercado/cotacoes', expect.anything());
    });

    it('carrega os valores da conta assim que o login confirma a atualizacao', async () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        http.mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 32, moeda: 'BRL' }] });
        render(<MarketTicker />);
        await screen.findAllByText('R$ 32,00');
        http.mockImplementation(async (path) => path === '/auth/login'
            ? { ok: true, json: async () => ({ token: 'token-user', role: 'USER', cotacoesAtualizadas: true }) }
            : { ok: true, json: async () => [{ ticker: 'IBM', cotacaoAtual: 45, moeda: 'USD' }] });
        await act(async () => login('pessoa@teste.local', 'senha-teste'));
        expect(await screen.findAllByText('US$ 45,00')).toHaveLength(2);
        expect(http).not.toHaveBeenCalledWith('/acoes/atualizar-cotacoes', expect.anything());
    });

    it('atualiza periodicamente o mercado mesmo antes do login', async () => {
        vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
        try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            http.mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 32, moeda: 'BRL' }] })
                .mockResolvedValueOnce({ ok: true, json: async () => [{ ticker: 'PETR4', cotacaoAtual: 33, moeda: 'BRL' }] });
            const tela = render(<MarketTicker />);
            await screen.findAllByText('R$ 32,00');
            await act(async () => vi.advanceTimersByTime(30000));
            expect(await screen.findAllByText('R$ 33,00')).toHaveLength(2);
            tela.unmount();
            await act(async () => vi.advanceTimersByTime(30000));
            expect(http).toHaveBeenCalledTimes(2);
        } finally {
            vi.useRealTimers();
        }
    });
});
