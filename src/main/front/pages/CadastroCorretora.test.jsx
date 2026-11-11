import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { renderWithRouter as render, http } from '../test/http';
import { AUTH_STORAGE_KEY } from '../services/auth';
import CadastroCorretora from './CadastroCorretora';

const responderCadastro = resposta => {
    http.mockImplementation(async (_rota, { method }) => method === 'POST' ? resposta : Response.json([]));
};

const preencherEEnviar = () => {
    const cnpj = screen.getByLabelText('Adicionar por CNPJ:');
    fireEvent.change(cnpj, { target: { value: ' 02332886000104 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));
    return cnpj;
};

describe('cadastro administrativo de corretoras', () => {
    it('mostra os dois estados de validação e atualiza a lista após cadastrar por CNPJ', async () => {
        const corretoras = [
            { id: 'alfa', cnpj: '12345678000195', razaoSocial: 'Corretora Alfa', validadaNaCvm: true },
            { id: 'beta', cnpj: '98765432000110', razaoSocial: 'Corretora Beta', validadaNaCvm: false }
        ];
        const nova = { id: 'gama', cnpj: '02332886000104', razaoSocial: 'Corretora Gama', validadaNaCvm: true };
        http.mockImplementation(async (_rota, { method }) => {
            if (method === 'POST') {
                corretoras.push(nova);
                return Response.json(nova, { status: 201 });
            }
            return Response.json(corretoras);
        });
        render(<CadastroCorretora />);
        const alfa = await screen.findByRole('row', { name: /Corretora Alfa/ });
        expect(within(alfa).getByText('Validada')).toBeInTheDocument();
        const beta = screen.getByRole('row', { name: /Corretora Beta/ });
        expect(within(beta).getByText('Não validada')).toBeInTheDocument();

        const filtro = screen.getByLabelText('Filtrar validação CVM');
        fireEvent.change(filtro, { target: { value: 'false' } });
        expect(screen.queryByRole('row', { name: /Corretora Alfa/ })).not.toBeInTheDocument();
        expect(screen.getByRole('row', { name: /Corretora Beta/ })).toBeInTheDocument();
        fireEvent.change(filtro, { target: { value: '' } });

        const cnpj = preencherEEnviar();
        expect(await screen.findByRole('alert')).toHaveTextContent('Corretora adicionada com sucesso. CVM validada.');
        expect(http).toHaveBeenCalledWith('/corretoras', expect.objectContaining({
            method: 'POST', body: JSON.stringify({ cnpj: '02332886000104' })
        }));
        expect(http.mock.calls.filter(([, opcoes]) => opcoes.method === 'POST')).toHaveLength(1);
        expect(cnpj).toHaveValue('');
        expect(await screen.findByRole('cell', { name: 'Corretora Gama' })).toBeInTheDocument();
    });

    it('preserva o status se a consulta falhar e mostra fonte, data e resultado após revalidar', async () => {
        let corretora = { id: 'alfa', cnpj: '12345678000195', razaoSocial: 'Corretora Alfa', validadaNaCvm: true };
        let concluirConsulta;
        http.mockImplementation(async (_rota, { method }) => {
            if (method === 'POST') return new Promise(resolve => { concluirConsulta = resolve; });
            return Response.json([corretora]);
        });
        render(<CadastroCorretora />);
        const linha = await screen.findByRole('row', { name: /Corretora Alfa/ });
        expect(within(linha).getByText('Sem verificação registrada')).toBeInTheDocument();

        const revalidar = within(linha).getByRole('button', { name: /Revalidar/ });
        fireEvent.click(revalidar);
        expect(revalidar).toBeDisabled();
        fireEvent.click(revalidar);
        expect(http.mock.calls.filter(([, opcoes]) => opcoes.method === 'POST')).toHaveLength(1);
        expect(http).toHaveBeenCalledWith('/corretoras/alfa/revalidar', expect.objectContaining({ method: 'POST' }));
        concluirConsulta(Response.json({ message: 'Fonte indisponível' }, { status: 502 }));
        expect(await screen.findByRole('alert')).toHaveTextContent('O servidor está indisponível');
        expect(within(linha).getByText('Validada')).toBeInTheDocument();
        expect(revalidar).toBeEnabled();

        fireEvent.click(revalidar);
        corretora = {
            ...corretora, validadaNaCvm: false, ultimaValidacaoEm: '2026-11-10T17:30:00Z', fonteValidacao: 'BrasilAPI'
        };
        concluirConsulta(Response.json(corretora));
        const atualizada = await screen.findByRole('row', { name: /Corretora Alfa.*Não validada/ });
        expect(within(atualizada).getByText('BrasilAPI')).toBeInTheDocument();
        expect(within(atualizada).getByText(new Date(corretora.ultimaValidacaoEm).toLocaleString('pt-BR')))
            .toHaveAttribute('datetime', corretora.ultimaValidacaoEm);
        expect(screen.getByRole('status')).toHaveTextContent('A nova consulta classificou a corretora como não validada.');
    });

    it('mostra a validação salva quando a recarga da lista falha', async () => {
        const corretora = { id: 'beta', cnpj: '98765432000110', razaoSocial: 'Corretora Beta', validadaNaCvm: false };
        http.mockResolvedValueOnce(Response.json([corretora]))
            .mockResolvedValueOnce(Response.json({
                ...corretora, validadaNaCvm: true, ultimaValidacaoEm: '2026-11-10T17:30:00Z', fonteValidacao: 'BrasilAPI'
            }))
            .mockResolvedValueOnce(Response.json({}, { status: 503 }));
        render(<CadastroCorretora />);

        fireEvent.click(await screen.findByRole('button', { name: 'Revalidar Corretora Beta' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível atualizar a lista de corretoras.');
        expect(screen.getByRole('status')).toHaveTextContent('Corretora validada na nova consulta.');
        const linha = screen.getByRole('row', { name: /Corretora Beta/ });
        expect(within(linha).getByText('Validada')).toBeInTheDocument();
        expect(within(linha).getByText('BrasilAPI')).toBeInTheDocument();
    });

    it('explica acesso negado sem mostrar JSON nem encerrar a sessao', async () => {
        responderCadastro(Response.json({ status: 403, error: 'Forbidden' }, { status: 403 }));
        render(<CadastroCorretora />);
        const cnpj = preencherEEnviar();
        expect(await screen.findByRole('alert')).toHaveTextContent('Você não tem permissão para realizar esta ação.');
        expect(screen.queryByText(/Forbidden/)).not.toBeInTheDocument();
        expect(cnpj).not.toHaveValue('');
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();
    });

    it('orienta novo login quando a sessao expira', async () => {
        responderCadastro(Response.json({ message: 'Token inválido ou expirado.' }, { status: 401 }));
        render(<CadastroCorretora />);
        preencherEEnviar();
        expect(await screen.findByRole('alert')).toHaveTextContent('Sua sessão expirou ou é inválida. Faça login novamente.');
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
    });

    it.each([
        ['erro interno', () => Response.json({ message: 'Detalhe interno' }, { status: 500 }), 'O servidor está indisponível no momento. Tente novamente em instantes.'],
        ['resposta invalida', () => new Response('<html>Bad Gateway</html>', { status: 502 }), 'O servidor está indisponível no momento. Tente novamente em instantes.'],
        ['validacao', () => Response.json({ message: 'Dados da requisicao invalidos.', fields: { cnpj: 'Informe um CNPJ válido.' } }, { status: 400 }), 'Dados da requisicao invalidos. Informe um CNPJ válido.'],
        ['sem corpo', () => new Response('', { status: 400 }), 'Não foi possível adicionar a corretora.'],
        ['corretora rejeitada', () => Response.json({ message: 'CNPJ não validado' }, { status: 400 }), 'CNPJ não validado']
    ])('exibe uma mensagem legivel para %s', async (_caso, criarResposta, mensagem) => {
        responderCadastro(criarResposta());
        render(<CadastroCorretora />);
        const cnpj = preencherEEnviar();
        expect(await screen.findByRole('alert')).toHaveTextContent(mensagem);
        expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
        expect(cnpj).not.toHaveValue('');
    });

    it('mostra aviso se o servidor retornar uma corretora nao validada', async () => {
        responderCadastro(Response.json({ validadaNaCvm: false }, { status: 201 }));
        render(<CadastroCorretora />);
        preencherEEnviar();
        expect(await screen.findByRole('alert')).toHaveTextContent('CNPJ cadastrado, mas não é uma corretora de valores validada na CVM.');
    });
});
