import { renderWithRouter as render } from '../test/http';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Acoes from './Acoes';
import { http } from '../test/http';
import { marketUpdates } from '../test/http';


const ativo = { id: '1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', mercado: 'BR', cotacaoAtual: 30, moeda: 'BRL' };
const resposta = (dados, ok = true) => ({ ok, json: async () => dados });

describe('catalogo de acoes', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('exibe o catalogo e permite filtrar o mercado', async () => {
        http.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        expect(await screen.findByRole('cell', { name: 'Petrobras' })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar mercado'), { target: { value: 'US' } });
        expect(screen.getByText('Nenhum ativo encontrado.')).toBeInTheDocument();
    });

    it('atualiza as cotacoes e avisa o carrossel', async () => {
        http.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('1 cotação atualizada no catálogo.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/acoes/atualizar-cotacoes', expect.objectContaining({ method: 'PUT' }));
        expect(marketUpdates).toHaveBeenCalled();
    });

    it('mostra uma mensagem quando o catalogo nao pode ser carregado', async () => {
        http.mockResolvedValue(resposta({ message: 'Erro de conexão' }, false));
        render(<Acoes />);
        expect(await screen.findByText('Erro de conexão')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Atualizar cotações' })).toBeDisabled();
    });

    it('cadastra um ativo americano e atualiza o catalogo', async () => {
        http.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        const form = screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form');
        fireEvent.change(screen.getByPlaceholderText('Ex: PETR4'), { target: { value: 'IBM' } });
        fireEvent.change(form.querySelector('select'), { target: { value: 'US' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Ativo cadastrado no catálogo com sucesso.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/acoes', expect.objectContaining({ method: 'POST', body: JSON.stringify({ ticker: 'IBM', mercado: 'US' }) }));
        expect(marketUpdates).toHaveBeenCalled();
    });

    it('exibe erro ao cadastrar e ao atualizar cotacoes', async () => {
        http.mockResolvedValueOnce(resposta([ativo])).mockResolvedValueOnce(resposta({ message: 'Ativo inválido' }, false)).mockResolvedValueOnce(resposta({ message: 'Serviço indisponível' }, false));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form'));
        expect(await screen.findByText('Ativo inválido')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('Serviço indisponível')).toBeInTheDocument();
    });

    it('filtra ticker, empresa e data de atualizacao', async () => {
        http.mockResolvedValue(resposta([{ ...ativo, dataHoraCotacao: '2026-01-01T12:00:00' }, { ...ativo, id: '2', ticker: 'IBM', nomeEmpresa: 'IBM', mercado: 'US', moeda: 'USD', dataHoraCotacao: '2026-01-02T12:00:00' }]));
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
