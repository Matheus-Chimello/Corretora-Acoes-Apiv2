import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import { http } from '../test/http';
import { AUTH_STORAGE_KEY } from '../services/auth';


describe('visao geral', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('exibe o catálogo sem alerta quando o login mantém as cotações anteriores', async () => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-user', cotacoesAtualizadas: false }));
        const respostas = {
            '/api/dashboard/stats': { corretorasCount: 0 },
            '/acoes': [{ ticker: 'PETR4', cotacaoAtual: 30 }],
            '/carteiras/principal': { saldoEmConta: 0 }
        };
        http.mockImplementation(async (url) => ({ ok: true, json: async () => respostas[url] ?? [] }));
        render(<MemoryRouter><Dashboard /></MemoryRouter>);

        const catalogo = within(screen.getByRole('link', { name: /Ações cadastradas/ }));
        expect(await catalogo.findByText('1')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('exibe a posicao e seu resultado com os dados da API', async () => {
        const respostas = {
            '/api/dashboard/stats': { corretorasCount: 1 },
            '/api/dashboard/acoes': [{ posicaoId: 'p1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', moeda: 'BRL', posicao: 120, lucroPrejuizo: 20, rentabilidadePercentual: 20, corretoraRelacionada: { nomeFantasia: 'Primeira' } }],
            '/acoes': [{ ticker: 'PETR4', cotacaoAtual: 30 }],
            '/carteiras/principal': { saldoEmConta: 100 },
            '/carteiras/principal/transacoes': []
        };
        http.mockImplementation(async (url) => ({ ok: true, json: async () => respostas[url] }));
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByText('Petrobras')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Resumo financeiro da carteira' })).toBeInTheDocument();
        expect(screen.getByText('R$ 20,00 (+20,00%)')).toBeInTheDocument();
        expect(screen.getByLabelText('100.0% da carteira')).toBeInTheDocument();
    });

    it('mostra os estados vazios quando nao ha posicoes ou acoes', async () => {
        http.mockImplementation(async (url) => ({ ok: true, json: async () => url.endsWith('stats') ? { corretorasCount: 0 } : url === '/carteiras/principal' ? { saldoEmConta: 0 } : [] }));
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByText('Nenhuma posição disponível para exibição.')).toBeInTheDocument();
        expect(screen.getByText('Cadastre ações para visualizar as cotações.')).toBeInTheDocument();
    });

    it('aceita dados agrupados e apresenta prejuizo de ativo americano', async () => {
        const respostas = {
            '/api/dashboard/stats': { corretorasCount: 0 },
            '/api/dashboard/acoes': { acoes: [{ posicaoId: 'p1', ticker: 'IBM', moeda: 'USD', posicao: 0, lucroPrejuizo: -10, rentabilidadePercentual: -5 }] },
            '/acoes': [{ ticker: 'IBM', cotacaoAtual: 100 }],
            '/carteiras/principal': null,
            '/carteiras/principal/transacoes': null
        };
        http.mockImplementation(async (url) => ({ ok: true, json: async () => respostas[url] }));
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByText('Ação cadastrada')).toBeInTheDocument();
        expect(screen.getByText('-US$ 10,00 (-5,00%)')).toHaveClass('performance-negative');
        expect(screen.getByLabelText('0.0% da carteira')).toBeInTheDocument();
    });

    it('mantem o painel vazio quando uma requisicao falha', async () => {
        const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
        http.mockResolvedValue({ ok: false });
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        await vi.waitFor(() => expect(erro).toHaveBeenCalled());
        expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os dados do painel.');
        expect(screen.getByText('Nenhuma posição disponível para exibição.')).toBeInTheDocument();
        erro.mockRestore();
    });

    it('orienta novo login se uma das consultas do painel perder a sessao', async () => {
        http.mockImplementation(async (url) => url === '/carteiras/principal'
            ? new Response('{}', { status: 401 })
            : { ok: true, json: async () => [] });
        render(<MemoryRouter><Dashboard /></MemoryRouter>);
        expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou ou é inválida. Faça login novamente.');
    });
});
