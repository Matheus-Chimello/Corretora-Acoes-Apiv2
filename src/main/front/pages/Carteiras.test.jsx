import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Carteiras from './Carteiras';
import { apiFetch } from '../services/api';
import { notifyMarketTickerUpdate } from '../services/marketTicker';

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../services/marketTicker', () => ({ notifyMarketTickerUpdate: vi.fn() }));

const corretoras = [
    { id: 'c1', razaoSocial: 'Primeira', validadaNaCvm: true },
    { id: 'c2', razaoSocial: 'Segunda', validadaNaCvm: true },
    { id: 'c3', razaoSocial: 'Invalida', validadaNaCvm: false }
];
const ativo = { id: 'a1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', mercado: 'BR', cotacaoAtual: 30, moeda: 'BRL' };
const posicao = { posicaoId: 'p1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', mercado: 'BR', moeda: 'BRL', quantidadeTotal: 4, cotacaoAtual: 30, precoMedio: 25, posicao: 120, lucroPrejuizo: 20, rentabilidadePercentual: 20, corretoraRelacionada: corretoras[0] };
const resposta = (dados, ok = true) => ({ ok, json: async () => dados });

describe('operacoes da carteira', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        apiFetch.mockImplementation(async (url) => {
            const dados = {
                '/carteiras/principal': { id: 'carteira' },
                '/carteiras/principal/posicoes': [posicao],
                '/acoes': [ativo],
                '/corretoras': corretoras,
                '/carteiras/principal/transacoes': [],
                '/carteiras/principal/atualizar-cotacoes': [posicao]
            };
            return resposta(dados[url] ?? {});
        });
    });
    afterEach(cleanup);

    const abrir = async () => {
        const tela = render(<Carteiras />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        return tela;
    };

    it('compra com outra corretora e valor unitario informado', async () => {
        await abrir();
        const form = screen.getByRole('button', { name: 'Comprar' }).closest('form');
        const [acao, corretora] = within(form).getAllByRole('combobox');
        expect(within(corretora).queryByText('Invalida')).not.toBeInTheDocument();
        fireEvent.change(acao, { target: { value: 'a1' } });
        fireEvent.change(corretora, { target: { value: 'c2' } });
        const inputs = within(form).getAllByRole('spinbutton');
        expect(inputs[1]).toHaveValue(30);
        fireEvent.change(inputs[0], { target: { value: '2' } });
        fireEvent.change(inputs[1], { target: { value: '31' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Compra registrada na carteira.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/carteiras/principal/acoes/a1/compras', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ corretoraId: 'c2', quantidade: '2', valorUnitario: '31' })
        }));
        expect(notifyMarketTickerUpdate).toHaveBeenCalled();
    });

    it('recusa quantidade fracionada na compra brasileira', async () => {
        await abrir();
        const form = screen.getByRole('button', { name: 'Comprar' }).closest('form');
        const [acao, corretora] = within(form).getAllByRole('combobox');
        fireEvent.change(acao, { target: { value: 'a1' } });
        fireEvent.change(corretora, { target: { value: 'c2' } });
        fireEvent.change(within(form).getAllByRole('spinbutton')[0], { target: { value: '1.5' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Ações brasileiras permitem somente quantidade inteira.')).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/compras'), expect.anything());
    });

    it('registra venda com quantidade e preco informados', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Vender' }));
        const form = screen.getByRole('button', { name: 'Confirmar venda' }).closest('form');
        const [quantidade, valor] = within(form).getAllByRole('spinbutton');
        fireEvent.change(quantidade, { target: { value: '2' } });
        fireEvent.change(valor, { target: { value: '35' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Venda registrada e saldo atualizado.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/carteiras/principal/posicoes/p1/vendas', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ quantidade: '2', valorUnitario: '35' })
        }));
    });

    it('impede venda acima da quantidade disponivel', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Vender' }));
        const form = screen.getByRole('button', { name: 'Confirmar venda' }).closest('form');
        fireEvent.change(within(form).getAllByRole('spinbutton')[0], { target: { value: '5' } });
        fireEvent.submit(form);
        expect(await screen.findByText('A quantidade informada é maior que a disponível na sua carteira.')).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/vendas'), expect.anything());
    });

    it('nao transfere sem escolher uma corretora de destino', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
        const form = screen.getByRole('button', { name: 'Confirmar transferência' }).closest('form');
        fireEvent.submit(form);
        expect(await screen.findByText('Selecione a corretora de destino e informe uma quantidade válida.')).toBeInTheDocument();
        expect(apiFetch).not.toHaveBeenCalledWith(expect.stringContaining('/transferencias'), expect.anything());
    });

    it('registra um aporte na carteira', async () => {
        await abrir();
        const form = screen.getByRole('button', { name: 'Adicionar saldo' }).closest('form');
        fireEvent.change(within(form).getByRole('spinbutton'), { target: { value: '100' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Aporte registrado com sucesso.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/carteiras/principal/aportes', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ valor: '100' })
        }));
    });

    it('transfere para outra corretora', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
        const form = screen.getByRole('button', { name: 'Confirmar transferência' }).closest('form');
        fireEvent.change(within(form).getByRole('combobox'), { target: { value: 'c2' } });
        fireEvent.change(within(form).getByRole('spinbutton'), { target: { value: '2' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Transferência registrada entre as corretoras.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/carteiras/principal/posicoes/p1/transferencias', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ corretoraDestinoId: 'c2', quantidade: '2' })
        }));
    });

    it('atualiza as cotacoes das posicoes e o carrossel', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('1 posição atualizada com as cotações mais recentes.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/carteiras/principal/atualizar-cotacoes', { method: 'PUT' });
        await waitFor(() => expect(notifyMarketTickerUpdate).toHaveBeenCalled());
    });

    it('filtra posicoes por resultado e mercado', async () => {
        await abrir();
        const filtros = screen.getByRole('group', { name: 'Filtros de posições' });
        fireEvent.change(within(filtros).getByLabelText('Filtrar resultado'), { target: { value: 'negativo' } });
        expect(screen.getByText('Nenhuma posição encontrada.')).toBeInTheDocument();
        fireEvent.change(within(filtros).getByLabelText('Filtrar resultado'), { target: { value: 'positivo' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar mercado'), { target: { value: 'US' } });
        expect(screen.getByText('Nenhuma posição encontrada.')).toBeInTheDocument();
        fireEvent.change(within(filtros).getByLabelText('Filtrar mercado'), { target: { value: 'BR' } });
        expect(screen.getByRole('cell', { name: 'Petrobras' })).toBeInTheDocument();
    });

    it('exibe falha da API de compra sem confirmar operacao', async () => {
        const padrao = apiFetch.getMockImplementation();
        apiFetch.mockImplementation(async (url, options) => options?.method === 'POST'
            ? resposta({ message: 'Saldo insuficiente' }, false) : padrao(url));
        await abrir();
        const form = screen.getByRole('button', { name: 'Comprar' }).closest('form');
        const [acao, corretora] = within(form).getAllByRole('combobox');
        fireEvent.change(acao, { target: { value: 'a1' } });
        fireEvent.change(corretora, { target: { value: 'c2' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Saldo insuficiente')).toBeInTheDocument();
        expect(notifyMarketTickerUpdate).not.toHaveBeenCalled();
    });

    it('permite cancelar venda e transferencia', async () => {
        await abrir();
        fireEvent.click(screen.getByRole('button', { name: 'Vender' }));
        fireEvent.click(screen.getByRole('button', { name: 'Fechar venda' }));
        expect(screen.queryByRole('button', { name: 'Confirmar venda' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Transferir' }));
        fireEvent.click(screen.getByRole('button', { name: 'Fechar transferência' }));
        expect(screen.queryByRole('button', { name: 'Confirmar transferência' })).not.toBeInTheDocument();
    });

    it('exibe erro quando nao consegue carregar os dados', async () => {
        apiFetch.mockResolvedValue(resposta({}, false));
        render(<Carteiras />);
        expect(await screen.findByText('Não foi possível carregar os dados da carteira.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Comprar' })).toBeDisabled();
    });

    it('exibe e filtra o historico por tipo, ativo, corretora e data', async () => {
        const padrao = apiFetch.getMockImplementation();
        const transacoes = [
            { id: 't1', tipo: 'COMPRA', ticker: 'PETR4', nomeEmpresa: 'Petrobras', corretora: corretoras[0], quantidade: 2, precoUnitario: 30, valorTotal: 60, moeda: 'BRL', dataHora: '2026-01-01T12:00:00' },
            { id: 't2', tipo: 'APORTE', valorTotal: 100, moeda: 'BRL', dataHora: '2026-01-02T12:00:00' }
        ];
        apiFetch.mockImplementation(async (url) => url.endsWith('/transacoes') ? resposta(transacoes) : padrao(url));
        await abrir();
        const filtros = screen.getByRole('group', { name: 'Filtros de transações' });
        expect(screen.getByText('Saldo em conta')).toBeInTheDocument();
        fireEvent.change(within(filtros).getByLabelText('Filtrar tipo de transação'), { target: { value: 'COMPRA' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar ativo'), { target: { value: 'PETR4' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar corretora'), { target: { value: 'Primeira' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar data'), { target: { value: '2026-01-01' } });
        expect(screen.queryByText('Saldo em conta')).not.toBeInTheDocument();
        fireEvent.change(within(filtros).getByLabelText('Filtrar data'), { target: { value: '2026-01-02' } });
        expect(screen.getByText('Nenhuma transação encontrada.')).toBeInTheDocument();
    });

    it('exibe posicoes negativas e neutras e filtra corretora e ticker', async () => {
        const padrao = apiFetch.getMockImplementation();
        const posicoes = [
            { ...posicao, lucroPrejuizo: -5, rentabilidadePercentual: -5 },
            { ...posicao, posicaoId: 'p2', ticker: 'IBM', nomeEmpresa: 'IBM', mercado: 'US', moeda: 'USD', lucroPrejuizo: 0, rentabilidadePercentual: 0, corretoraRelacionada: corretoras[1] }
        ];
        apiFetch.mockImplementation(async (url) => url.endsWith('/posicoes') ? resposta(posicoes) : padrao(url));
        await abrir();
        const filtros = screen.getByRole('group', { name: 'Filtros de posições' });
        fireEvent.change(within(filtros).getByLabelText('Filtrar resultado'), { target: { value: 'neutro' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar ticker'), { target: { value: 'IBM' } });
        fireEvent.change(within(filtros).getByLabelText('Filtrar corretora'), { target: { value: 'Segunda' } });
        expect(screen.getAllByRole('cell', { name: 'IBM' })).toHaveLength(2);
        expect(screen.queryByRole('cell', { name: 'Petrobras' })).not.toBeInTheDocument();
    });
});
