import React from 'react';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { renderWithRouter as render, http } from '../test/http';
import Usuarios from './Usuarios';

const ana = { id: 'u1', nome: 'Ana Teste', email: 'ana@teste.local', papel: 'USER', ativo: true };
const resposta = (dados, status = 200) => new Response(status === 204 ? null : JSON.stringify(dados), { status });

describe('painel de administracao', () => {
    it('cadastra uma conta com perfil USER e apresenta o cadastro retornado pela API', async () => {
        http.mockResolvedValueOnce(resposta([])).mockResolvedValueOnce(resposta(ana, 201));
        render(<Usuarios />);
        await screen.findByText('Nenhum usuário cadastrado.');
        fireEvent.click(screen.getByRole('button', { name: 'Novo usuário' }));
        const dialogo = screen.getByRole('dialog', { name: 'Novo usuário' });
        fireEvent.change(within(dialogo).getByLabelText('Nome'), { target: { value: ana.nome } });
        fireEvent.change(within(dialogo).getByLabelText('Email'), { target: { value: ana.email } });
        expect(within(dialogo).getByLabelText('Perfil')).toHaveValue('USER');
        fireEvent.change(within(dialogo).getByLabelText('Senha inicial'), { target: { value: 'senha-inicial' } });
        fireEvent.change(within(dialogo).getByLabelText('Confirmar senha'), { target: { value: 'senha-inicial' } });
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Cadastrar usuário' }));
        expect(await screen.findByRole('cell', { name: ana.email })).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/usuarios', expect.objectContaining({ method: 'POST',
            body: JSON.stringify({ nome: ana.nome, email: ana.email, papel: 'USER', password: 'senha-inicial' }) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('alert')).toHaveTextContent('Usuário cadastrado com sucesso.');
    });

    it('altera perfil e situacao sem enviar nem exibir a senha da conta', async () => {
        http.mockResolvedValueOnce(resposta([ana]))
            .mockResolvedValueOnce(resposta({ ...ana, papel: 'ADMIN', ativo: false }));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.click(screen.getByRole('button', { name: `Editar ${ana.nome}` }));
        const dialogo = screen.getByRole('dialog', { name: 'Editar usuário' });
        expect(within(dialogo).queryByLabelText('Senha inicial')).not.toBeInTheDocument();
        fireEvent.change(within(dialogo).getByLabelText('Perfil'), { target: { value: 'ADMIN' } });
        fireEvent.click(within(dialogo).getByLabelText('Conta ativa'));
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Usuário atualizado com sucesso.');
        expect(http).toHaveBeenLastCalledWith('/api/usuarios/u1', expect.objectContaining({ method: 'PUT',
            body: JSON.stringify({ nome: ana.nome, email: ana.email, papel: 'ADMIN', ativo: false }) }));
        expect(screen.getByRole('cell', { name: 'Inativa' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'Administrador' })).toBeInTheDocument();
    });

    it('confirma a senha antes de alterar e aceita a resposta sem corpo', async () => {
        http.mockResolvedValueOnce(resposta([ana])).mockResolvedValueOnce(resposta(null, 204));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.click(screen.getByRole('button', { name: `Alterar senha de ${ana.nome}` }));
        const dialogo = screen.getByRole('dialog', { name: 'Alterar senha' });
        fireEvent.change(within(dialogo).getByLabelText('Nova senha'), { target: { value: 'nova-senha-segura' } });
        fireEvent.change(within(dialogo).getByLabelText('Confirmar senha'), { target: { value: 'outra-senha' } });
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Alterar senha' }));
        expect(await within(dialogo).findByRole('alert')).toHaveTextContent('As senhas não conferem.');
        expect(http).toHaveBeenCalledTimes(1);
        fireEvent.change(within(dialogo).getByLabelText('Confirmar senha'), { target: { value: 'nova-senha-segura' } });
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Alterar senha' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Senha alterada com sucesso.');
        expect(http).toHaveBeenLastCalledWith('/api/usuarios/u1/senha', expect.objectContaining({ method: 'PUT', body: JSON.stringify({ password: 'nova-senha-segura' }) }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('filtra contas por nome ou email, perfil e situacao', async () => {
        const outro = { id: 'u2', nome: 'Bruno Teste', email: 'bruno@teste.local', papel: 'ADMIN', ativo: false };
        http.mockResolvedValueOnce(resposta([ana, outro]));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.change(screen.getByLabelText('Buscar por nome ou email'), { target: { value: 'ANA@TESTE' } });
        expect(screen.queryByRole('cell', { name: outro.email })).not.toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Filtrar perfil'), { target: { value: 'ADMIN' } });
        expect(screen.getByText('Nenhum usuário encontrado para os filtros.')).toBeInTheDocument();
        fireEvent.change(screen.getByLabelText('Buscar por nome ou email'), { target: { value: '' } });
        fireEvent.change(screen.getByLabelText('Filtrar situação'), { target: { value: 'inativas' } });
        expect(screen.getByRole('cell', { name: outro.email })).toBeInTheDocument();
        expect(screen.queryByRole('cell', { name: ana.email })).not.toBeInTheDocument();
    });

    it('mostra erro de permissao no formulario sem alterar a lista', async () => {
        http.mockResolvedValueOnce(resposta([ana])).mockResolvedValueOnce(resposta({ message: 'Forbidden' }, 403));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.click(screen.getByRole('button', { name: `Editar ${ana.nome}` }));
        const dialogo = screen.getByRole('dialog');
        fireEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }));
        expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Você não tem permissão para realizar esta ação.');
        expect(screen.queryByText('Usuário atualizado com sucesso.')).not.toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'Ativa' })).toBeInTheDocument();
    });

    it('permite tentar novamente apos falha no carregamento e remove o aviso antigo', async () => {
        http.mockResolvedValueOnce(resposta({}, 503)).mockResolvedValueOnce(resposta([ana]));
        render(<Usuarios />);
        expect(await screen.findByRole('alert')).toHaveTextContent('O servidor está indisponível');
        fireEvent.click(screen.getByRole('button', { name: 'Recarregar' }));
        await screen.findByRole('cell', { name: ana.email });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('mantem o foco no dialogo e limpa senhas ao cancelar com Escape', async () => {
        http.mockResolvedValueOnce(resposta([ana]));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.click(screen.getByRole('button', { name: `Alterar senha de ${ana.nome}` }));
        const dialogo = screen.getByRole('dialog');
        const salvar = within(dialogo).getByRole('button', { name: 'Alterar senha' });
        salvar.focus();
        fireEvent.keyDown(salvar, { key: 'Tab' });
        expect(within(dialogo).getByRole('button', { name: 'Fechar formulário' })).toHaveFocus();
        fireEvent.keyDown(document.activeElement, { key: 'Tab', shiftKey: true });
        expect(salvar).toHaveFocus();
        fireEvent.change(within(dialogo).getByLabelText('Nova senha'), { target: { value: 'segredo-temporario' } });
        fireEvent.keyDown(dialogo, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: `Alterar senha de ${ana.nome}` }));
        expect(screen.getByLabelText('Nova senha')).toHaveValue('');
    });

    it('impede envios e fechamento duplicados enquanto salva', async () => {
        let concluir;
        http.mockResolvedValueOnce(resposta([ana])).mockReturnValueOnce(new Promise(resolve => { concluir = resolve; }));
        render(<Usuarios />);
        await screen.findByRole('cell', { name: ana.email });
        fireEvent.click(screen.getByRole('button', { name: `Editar ${ana.nome}` }));
        const dialogo = screen.getByRole('dialog');
        const form = within(dialogo).getByRole('button', { name: 'Salvar alterações' }).closest('form');
        fireEvent.submit(form);
        expect(within(dialogo).getByRole('button', { name: 'Salvando...' })).toBeDisabled();
        expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeDisabled();
        fireEvent.submit(form);
        fireEvent.keyDown(dialogo, { key: 'Escape' });
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(http).toHaveBeenCalledTimes(2);
        await act(async () => concluir(resposta(ana)));
        expect(await screen.findByRole('alert')).toHaveTextContent('Usuário atualizado com sucesso.');
    });
});
