import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Corretoras from './Corretoras';
import { AUTH_STORAGE_KEY } from '../services/auth';
import { http, renderWithRouter as render } from '../test/http';

const corretora = { cnpj: '123', razaoSocial: 'Corretora A', cidade: 'Sao Paulo', uf: 'SP', validadaNaCvm: true };
const resposta = (dados, ok = true) => ({ ok, json: async () => dados });

describe('corretoras', () => {
    beforeEach(() => {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste', role: 'USER' }));
    });

    it('mostra uma falha de conexao durante o carregamento', async () => {
        http.mockRejectedValue(new TypeError('Failed to fetch'));
        render(<Corretoras />);
        expect(await screen.findByRole('alert')).toHaveTextContent(
            'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
        );
    });

    it('mostra somente corretoras validadas para o usuário comum', async () => {
        const naoValidada = { cnpj: '456', razaoSocial: 'Corretora B', validadaNaCvm: false };
        const semValidacao = { cnpj: '789', razaoSocial: 'Corretora C', validadaNaCvm: null };
        http.mockResolvedValue(resposta([corretora, naoValidada, semValidacao]));
        render(<Corretoras />);
        expect(await screen.findByRole('cell', { name: 'Corretora A' })).toBeInTheDocument();
        expect(screen.queryAllByText('Corretora B')).toHaveLength(0);
        expect(screen.queryAllByText('Corretora C')).toHaveLength(0);
        expect(screen.queryByLabelText('Filtrar validação CVM')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Revalidar/ })).not.toBeInTheDocument();
        expect(screen.getByText('1 de 1')).toBeInTheDocument();
    });

    it('ordena corretoras e filtra por campos de contato', async () => {
        const outra = { cnpj: '456', razaoSocial: 'Corretora B', telefone: '9999', cidade: 'Campinas', uf: 'SP', validadaNaCvm: true };
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
        fireEvent.change(screen.getByLabelText('Filtrar CNPJ'), { target: { value: '123' } });
        expect(screen.getByText('Nenhuma corretora encontrada.')).toBeInTheDocument();
    });

    it('trata erro ao carregar corretoras e resposta sem lista', async () => {
        http.mockResolvedValueOnce(resposta({}, false));
        const primeira = render(<Corretoras />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as corretoras.');
        primeira.unmount();
        http.mockResolvedValueOnce(resposta({}));
        render(<Corretoras />);
        expect(await screen.findByText('Nenhuma corretora validada no momento.')).toBeInTheDocument();
    });
});
