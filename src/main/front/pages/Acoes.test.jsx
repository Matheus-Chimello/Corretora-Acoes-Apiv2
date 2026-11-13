import { renderWithRouter as render } from '../test/http';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Acoes from './Acoes';
import { http } from '../test/http';
import { marketUpdates } from '../test/http';
import { AUTH_STORAGE_KEY } from '../services/auth';


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

    it('cadastra um ativo americano no catalogo de USER', async () => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-user', role: 'USER' }));
        http.mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        const form = screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form');
        fireEvent.change(screen.getByPlaceholderText('Ex: PETR4'), { target: { value: 'IBM' } });
        fireEvent.change(form.querySelector('select'), { target: { value: 'US' } });
        fireEvent.submit(form);
        expect(await screen.findByText('Ativo cadastrado no catálogo com sucesso.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/acoes', expect.objectContaining({ method: 'POST', body: JSON.stringify({ ticker: 'IBM', mercado: 'US' }) }));
        const [, envio] = http.mock.calls.find(([rota, opcoes]) => rota === '/acoes' && opcoes.method === 'POST');
        expect(envio.headers.get('Authorization')).toBe('Bearer token-user');
        expect(marketUpdates).toHaveBeenCalled();
    });

    it.each([
        ['MSFT', 'BR', 'USD', 'EUA', 'US'],
        ['PETR3', 'US', 'BRL', 'Brasil', 'BR']
    ])('sugere o mercado de %s pela moeda da cotação e pede confirmação antes de cadastrar', async (ticker, anterior, moeda, nomeMercado, mercado) => {
        http.mockResolvedValueOnce(resposta([ativo])).mockResolvedValueOnce(Response.json({
            message: 'Mercado incompatível.', mercadoSugerido: mercado
        }, { status: 400 })).mockResolvedValue(resposta([ativo]));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        const form = screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form');
        const campoTicker = screen.getByLabelText('Ticker', { exact: true });
        fireEvent.change(campoTicker, { target: { value: ticker } });
        fireEvent.change(screen.getByLabelText('Mercado', { exact: true }), { target: { value: anterior } });
        fireEvent.submit(form);
        fireEvent.submit(form);
        const aviso = `A cotação veio em ${moeda}. Confira o mercado ${nomeMercado} e confirme o cadastro.`;
        expect(await screen.findByText(aviso)).toBeInTheDocument();
        expect(form.querySelector('select')).toHaveValue(mercado);
        expect(http.mock.calls.filter(([, opcoes]) => opcoes.method === 'POST')).toHaveLength(1);

        fireEvent.change(campoTicker, { target: { value: ticker + 'X' } });
        expect(screen.queryByText(aviso)).not.toBeInTheDocument();
        fireEvent.change(campoTicker, { target: { value: ticker } });
        fireEvent.submit(form);
        expect(await screen.findByText('Ativo cadastrado no catálogo com sucesso.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/acoes', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ ticker, mercado })
        }));
    });

    it('exibe erro ao cadastrar e ao atualizar cotacoes', async () => {
        http.mockResolvedValueOnce(resposta([ativo])).mockResolvedValueOnce(Response.json({ message: 'Ativo inválido' }, { status: 400 }))
            .mockResolvedValueOnce(resposta({ message: 'Serviço indisponível' }, false));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.submit(screen.getByRole('button', { name: 'Cadastrar ativo' }).closest('form'));
        expect(await screen.findByText('Ativo inválido')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByText('Serviço indisponível')).toBeInTheDocument();
    });

    it('explica a falta de permissao ao atualizar cotacoes', async () => {
        http.mockResolvedValueOnce(resposta([ativo])).mockResolvedValueOnce(new Response('{}', { status: 403 }));
        render(<Acoes />);
        await screen.findByRole('cell', { name: 'Petrobras' });
        fireEvent.click(screen.getByRole('button', { name: 'Atualizar cotações' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para realizar esta ação.');
        expect(screen.queryByText(/cotação atualizada/)).not.toBeInTheDocument();
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
