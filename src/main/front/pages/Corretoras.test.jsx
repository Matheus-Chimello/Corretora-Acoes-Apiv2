import { renderWithRouter as render } from '../test/http';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Corretoras from './Corretoras';
import { http } from '../test/http';


const corretora = { cnpj: '123', razaoSocial: 'Corretora A', cidade: 'Sao Paulo', uf: 'SP', validadaNaCvm: true };
const resposta = (dados, ok = true) => ({ ok, json: async () => dados, text: async () => dados.message });

describe('corretoras', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(cleanup);

    it('mostra as corretoras e aplica filtros', async () => {
        http.mockResolvedValue(resposta([corretora]));
        render(<Corretoras />);
        expect(await screen.findByRole('cell', { name: 'Corretora A' })).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar validação CVM'), { target: { value: 'false' } });
        expect(screen.getByText('Nenhuma corretora encontrada.')).toBeInTheDocument();
    });

    it('adiciona uma corretora validada', async () => {
        http.mockResolvedValueOnce(resposta([])).mockResolvedValueOnce(resposta(corretora));
        render(<Corretoras />);
        fireEvent.change(screen.getByLabelText('Adicionar por CNPJ:'), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
        expect(await screen.findByText('Corretora adicionada com sucesso. CVM validada.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/corretoras', expect.objectContaining({ method: 'POST', body: JSON.stringify({ cnpj: '123' }) }));
        expect(within(screen.getByRole('table')).getByText('Corretora A')).toBeInTheDocument();
    });

    it('mostra o erro do servidor sem adicionar a corretora', async () => {
        http.mockResolvedValueOnce(resposta([])).mockResolvedValueOnce(resposta({ message: 'CNPJ não validado' }, false));
        const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<Corretoras />);
        fireEvent.change(screen.getByLabelText('Adicionar por CNPJ:'), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
        expect(await screen.findByText('CNPJ não validado')).toBeInTheDocument();
        expect(screen.queryByRole('table')).not.toBeInTheDocument();
        erro.mockRestore();
    });

    it('ordena corretoras e filtra por campos de contato', async () => {
        const outra = { cnpj: '456', razaoSocial: 'Corretora B', telefone: '9999', cidade: 'Campinas', uf: 'SP', validadaNaCvm: false };
        http.mockResolvedValue(resposta({ corretoras: [outra, corretora] }));
        render(<Corretoras />);
        await screen.findByRole('cell', { name: 'Corretora A' });
        fireEvent.click(screen.getByRole('columnheader', { name: 'Razão Social' }));
        expect(within(screen.getAllByRole('row')[1]).getByText('Corretora A')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('columnheader', { name: 'Razão Social' }));
        expect(within(screen.getAllByRole('row')[1]).getByText('Corretora B')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar CNPJ'), { target: { value: '456' } });
        fireEvent.change(screen.getByLabelText('Filtrar razão social'), { target: { value: 'Corretora B' } });
        fireEvent.change(screen.getByLabelText('Filtrar telefone'), { target: { value: '9999' } });
        fireEvent.change(screen.getByLabelText('Filtrar cidade ou UF'), { target: { value: 'Campinas/SP' } });
        expect(screen.getByRole('cell', { name: 'Corretora B' })).toBeInTheDocument();
        expect(screen.queryByRole('cell', { name: 'Corretora A' })).not.toBeInTheDocument();
    });

    it('mostra aviso se o servidor retornar uma corretora nao validada', async () => {
        http.mockResolvedValueOnce(resposta([])).mockResolvedValueOnce(resposta({ ...corretora, validadaNaCvm: false }));
        render(<Corretoras />);
        fireEvent.change(screen.getByLabelText('Adicionar por CNPJ:'), { target: { value: '123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
        expect(await screen.findByText('CNPJ cadastrado, mas não é uma corretora de valores validada na CVM.')).toBeInTheDocument();
    });

    it('trata erro ao carregar corretoras e resposta sem lista', async () => {
        const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
        http.mockResolvedValueOnce(resposta({}, false));
        const primeira = render(<Corretoras />);
        await vi.waitFor(() => expect(erro).toHaveBeenCalled());
        primeira.unmount();
        http.mockResolvedValueOnce(resposta({}));
        render(<Corretoras />);
        expect(await screen.findByText('Nenhuma corretora cadastrada no momento.')).toBeInTheDocument();
        erro.mockRestore();
    });
});
