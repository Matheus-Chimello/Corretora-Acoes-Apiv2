import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Acoes from './Acoes';
import { apiFetch } from '../services/api';
import { notifyMarketTickerUpdate } from '../services/marketTicker';

vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../services/api', () => ({ apiFetch: vi.fn() }));
vi.mock('../services/marketTicker', () => ({ notifyMarketTickerUpdate: vi.fn() }));

const ativo = { id: '1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', mercado: 'BR', cotacaoAtual: 30, moeda: 'BRL' };
const resposta = (dados, ok = true) => ({ ok, json: async () => dados });

describe('catalogo de acoes', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('exibe o catalogo e permite filtrar o mercado', async () => {
        apiFetch.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        expect(await screen.findByRole('cell', { name: 'Petrobras' })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar mercado'), { target: { value: 'US' } });
        expect(screen.getByText('Nenhum ativo encontrado.')).toBeInTheDocument();
    });

    it('atualiza as cotacoes e avisa o carrossel', async () => {
        apiFetch.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('1 cotação atualizada no catálogo.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/acoes/atualizar-cotacoes', { method: 'PUT' });
        expect(notifyMarketTickerUpdate).toHaveBeenCalled();
    });

    it('mostra uma mensagem quando o catalogo nao pode ser carregado', async () => {
        apiFetch.mockResolvedValue(resposta({ message: 'Erro de conexão' }, false));
        render(<Acoes />);
        expect(await screen.findByText('Erro de conexão')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Atualizar cotações' })).toBeDisabled();
    });

    it('cadastra um ativo americano e atualiza o catalogo', async () => {
        apiFetch.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        const form = screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form');
        fireEvent.change(screen.getByPlaceholderText('Ex: PETR4'), { target: { value: 'IBM' } });
        fireEvent.change(form.querySelector('select'), { target: { value: 'US' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Ativo cadastrado no catálogo com sucesso.')).toBeInTheDocument();
        expect(apiFetch).toHaveBeenCalledWith('/acoes', expect.objectContaining({ method: 'POST', body: JSON.stringify({ ticker: 'IBM', mercado: 'US' }) }));
        expect(notifyMarketTickerUpdate).toHaveBeenCalled();
    });

    it('exibe erro ao cadastrar e ao atualizar cotacoes', async () => {
        apiFetch.mockResolvedValueOnce(resposta([ativo])).mockResolvedValueOnce(resposta({ message: 'Ativo inválido' }, false)).mockResolvedValueOnce(resposta({ message: 'Serviço indisponível' }, false));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form'));
        expect(await screen.findByText('Ativo inválido')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('Serviço indisponível')).toBeInTheDocument();
    });

    it('filtra ticker, empresa e data de atualizacao', async () => {
        apiFetch.mockResolvedValue(resposta([{ ...ativo, dataHoraCotacao: '2026-01-01T12:00:00' }, { ...ativo, id: '2', ticker: 'IBM', nomeEmpresa: 'IBM', mercado: 'US', moeda: 'USD', dataHoraCotacao: '2026-01-02T12:00:00' }]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.change(screen.getByLabelText('Filtrar ticker'), { target: { value: 'IBM' } });
        expect(screen.queryByRole('cell', { name: 'Petrobras' })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar ticker'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar empresa'), { target: { value: 'Petrobras' } });
        fireEvent.change(screen.getByLabelText('Filtrar atualização'), { target: { value: '2026-01-01' } });
        expect(screen.getByRole('cell', { name: 'Petrobras' })).toBeInTheDocument();
        expect(screen.queryByRole('cell', { name: 'IBM' })).not.toBeInTheDocument();
    });
});
