import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App';
import { AUTH_STORAGE_KEY } from './services/auth';
import { http } from './test/http';

const iniciarSessao = role => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token: 'token-teste', role }));

describe('protecao de rotas', () => {
    afterEach(() => sessionStorage.clear());

    beforeEach(() => {
        iniciarSessao('USER');
        http.mockImplementation(async (path) => ({ ok: true, json: async () => {
            if (path === '/auth/login') return { token: 'token-admin', role: 'ADMIN', nome: 'Admin de teste' };
            if (path === '/carteiras/principal') return { id: 1, saldoEmConta: 0 };
            if (path.endsWith('/stats')) return { corretorasCount: 0 };
            return [];
        } }));
    });

    it('redireciona usuarios nao autenticados para login', async () => {
        window.location.hash = '#/carteiras';
        localStorage.removeItem(AUTH_STORAGE_KEY);
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Minha Carteira' })).not.toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/mercado/cotacoes', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/carteiras/principal', expect.anything());
    });

    it('permite acesso autenticado a carteira', async () => {
        window.location.hash = '#/carteiras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Minha Carteira' })).toBeInTheDocument();
    });

    it('abre o resumo mensal pelo menu do usuário e mantém o modo privacidade', async () => {
        window.location.hash = '#/carteiras';
        const padrao = http.getMockImplementation();
        http.mockImplementation(async (rota, options) => rota === '/carteiras/principal'
            ? Response.json({ saldoEmConta: 812.34, saldoEmDolar: 65 }) : padrao(rota, options));
        render(<App />);
        fireEvent.click(await screen.findByRole('button', { name: 'Modo privacidade' }));
        fireEvent.click(screen.getByRole('link', { name: 'Resumo mensal' }));
        expect(await screen.findByRole('heading', { name: 'Resumo mensal' })).toBeInTheDocument();
        const fechamento = within(await screen.findByRole('region', { name: 'Fechamento do mês' }));
        expect(screen.getByRole('button', { name: 'Modo privacidade' })).toHaveAttribute('aria-pressed', 'true');
        expect(fechamento.queryByText('R$ 812,34')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Modo privacidade' }));
        expect(fechamento.getAllByText('R$ 812,34')).toHaveLength(3);
    });

    it('oculta e restaura os valores e o gráfico da carteira na Visão geral', async () => {
        window.location.hash = '#/';
        const dados = {
            '/carteiras/principal': { saldoEmConta: 812.34, saldoEmDolar: 65 },
            '/api/dashboard/acoes': [{
                posicaoId: 'p1', ticker: 'PETR4', moeda: 'BRL',
                valorInvestido: 80, posicao: 100, lucroPrejuizo: 20, rentabilidadePercentual: 25
            }],
            '/carteiras/principal/transacoes': [{ tipo: 'APORTE', moeda: 'BRL', valorTotal: 800, dataHora: '2026-10-01T12:00:00' }]
        };
        http.mockImplementation(async (rota) => Response.json(dados[rota] ?? []));
        render(<App />);

        const resumo = within(await screen.findByRole('region', { name: 'Resumo financeiro da carteira' }));
        const grafico = within(screen.getByRole('region', { name: 'Evolução patrimonial' }));
        expect(await resumo.findByText('R$ 912,34')).toBeInTheDocument();
        expect(resumo.getByText('US$ 65,00')).toBeInTheDocument();
        expect(grafico.getByRole('button', { name: '30 dias' })).toBeInTheDocument();

        const modoPrivacidade = screen.getByRole('button', { name: 'Modo privacidade' });
        fireEvent.click(modoPrivacidade);
        expect(modoPrivacidade).toHaveAttribute('aria-pressed', 'true');
        expect(resumo.queryByText('R$ 912,34')).not.toBeInTheDocument();
        expect(resumo.queryByText('US$ 65,00')).not.toBeInTheDocument();
        expect(screen.queryByText(/25,00%/)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/% da carteira/)).not.toBeInTheDocument();
        expect(grafico.getByText('Gráfico oculto pelo modo privacidade.')).toBeInTheDocument();
        expect(grafico.queryByRole('button', { name: '30 dias' })).not.toBeInTheDocument();

        fireEvent.click(modoPrivacidade);
        expect(modoPrivacidade).toHaveAttribute('aria-pressed', 'false');
        expect(resumo.getByText('R$ 912,34')).toBeInTheDocument();
        expect(grafico.getByRole('button', { name: '30 dias' })).toBeInTheDocument();
    });

    it('mantém os dados da Carteira ocultos ao navegar e recarregar a mesma aba', async () => {
        window.location.hash = '#/';
        const posicao = {
            posicaoId: 'p1', ticker: 'PETR4', nomeEmpresa: 'Petrobras', moeda: 'BRL', mercado: 'BR',
            quantidadeTotal: 17, precoMedio: 25, cotacaoAtual: 30,
            posicao: 510, lucroPrejuizo: 85, rentabilidadePercentual: 20
        };
        const dados = {
            '/carteiras/principal': { saldoEmConta: 812.34, saldoEmDolar: 65 },
            '/carteiras/principal/posicoes': [posicao],
            '/carteiras/principal/transacoes': [{
                id: 't1', tipo: 'COMPRA', ticker: 'PETR4', moeda: 'BRL',
                quantidade: 17, precoUnitario: 25, valorTotal: 425, dataHora: '2026-10-01T12:00:00'
            }]
        };
        http.mockImplementation(async (rota) => Response.json(dados[rota] ?? []));
        const site = render(<App />);

        fireEvent.click(await screen.findByRole('button', { name: 'Modo privacidade' }));
        const menu = within(screen.getByRole('navigation', { name: 'Menu principal' }));
        fireEvent.click(menu.getByRole('link', { name: 'Carteira' }));

        const botao = await screen.findByRole('button', { name: 'Modo privacidade' });
        expect(botao).toHaveAttribute('aria-pressed', 'true');
        expect(await screen.findByRole('group', { name: 'Saldos disponíveis' })).toHaveTextContent('••••');
        expect(await screen.findByRole('cell', { name: 'Petrobras' })).toBeInTheDocument();
        expect(screen.getByRole('cell', { name: 'COMPRA' })).toBeInTheDocument();
        for (const valor of ['R$ 812,34', 'US$ 65,00', 'R$ 510,00', 'R$ 425,00', '17']) {
            expect(screen.queryByText(valor)).not.toBeInTheDocument();
        }

        site.unmount();
        render(<App />);
        const botaoAposRecarregar = await screen.findByRole('button', { name: 'Modo privacidade' });
        expect(botaoAposRecarregar).toHaveAttribute('aria-pressed', 'true');
        expect(await screen.findByRole('group', { name: 'Saldos disponíveis' })).toHaveTextContent('••••');

        fireEvent.click(botaoAposRecarregar);
        expect(screen.getByText('R$ 812,34')).toBeInTheDocument();
        const transacao = within(screen.getByRole('row', { name: /COMPRA/ }));
        expect(transacao.getByText('R$ 425,00')).toBeInTheDocument();
    });

    it('aplica o tema escolhido e restaura a preferência ao reabrir o site', async () => {
        window.location.hash = '#/minha-conta';
        const site = render(<App />);
        const temas = within(await screen.findByRole('group', { name: 'Tema do site' }));
        expect(temas.getByRole('radio', { name: 'Claro' })).toBeChecked();

        fireEvent.click(temas.getByRole('radio', { name: 'Escuro' }));
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

        site.unmount();
        document.documentElement.removeAttribute('data-theme');
        render(<App />);
        const temasSalvos = within(await screen.findByRole('group', { name: 'Tema do site' }));
        expect(temasSalvos.getByRole('radio', { name: 'Escuro' })).toBeChecked();
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

        fireEvent.click(temasSalvos.getByRole('radio', { name: 'Claro' }));
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    it.each(['USER', 'ADMIN'])('permite trocar a própria senha em Minha conta para %s', async (role) => {
        iniciarSessao(role);
        window.location.hash = role === 'ADMIN' ? '#/admin/usuarios' : '#/corretoras';
        const padrao = http.getMockImplementation();
        let trocas = 0;
        http.mockImplementation(async (rota) => {
            if (rota !== '/auth/me/senha') return padrao(rota);
            trocas += 1;
            return trocas === 1 ? Response.json({ message: 'Senha atual incorreta.' }, { status: 400 })
                : new Response(null, { status: 204 });
        });
        render(<App />);
        fireEvent.click(await screen.findByRole('link', { name: 'Minha conta' }));
        expect(await screen.findByRole('heading', { name: 'Minha conta' })).toBeInTheDocument();
        const atual = screen.getByLabelText('Senha atual');
        const nova = screen.getByLabelText('Nova senha');
        const confirmacao = screen.getByLabelText('Confirmar nova senha');
        fireEvent.change(atual, { target: { value: 'senha-errada' } });
        fireEvent.change(nova, { target: { value: 'senha-nova' } });
        fireEvent.change(confirmacao, { target: { value: 'senha-diferente' } });
        fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('As novas senhas não conferem.');
        expect(http).not.toHaveBeenCalledWith('/auth/me/senha', expect.anything());

        fireEvent.change(confirmacao, { target: { value: 'senha-nova' } });
        fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('Senha atual incorreta.');
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toBeNull();

        fireEvent.change(atual, { target: { value: 'senha-atual' } });
        fireEvent.click(screen.getByRole('button', { name: 'Alterar senha' }));
        expect(await screen.findByText('Senha alterada com sucesso.')).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/auth/me/senha', expect.objectContaining({
            method: 'PUT', body: JSON.stringify({ senhaAtual: 'senha-atual', novaSenha: 'senha-nova' })
        }));
        expect(atual).toHaveValue('');
        expect(nova).toHaveValue('');
        expect(confirmacao).toHaveValue('');
    });

    it('encerra a sessão e volta ao login quando a API rejeita a conta conectada', async () => {
        http.mockImplementation(async (rota) => rota === '/api/dashboard/corretoras'
            ? Response.json({ status: 401, error: 'Unauthorized' }, { status: 401 })
            : Response.json([]));
        window.location.hash = '#/corretoras';
        render(<App />);

        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/login');
        expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
        expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou ou é inválida. Faça login novamente.');
    });

    it('volta ao login em uma segunda aba quando a sessão compartilhada é encerrada', async () => {
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();

        const sessao = localStorage.getItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        fireEvent(window, new StorageEvent('storage', { key: AUTH_STORAGE_KEY, oldValue: sessao, newValue: null }));

        expect(await screen.findByRole('heading', { name: 'Boas-vindas de volta' })).toBeInTheDocument();
    });

    it('redireciona usuario autenticado do login para o dashboard', async () => {
        window.location.hash = '#/login';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Visão geral' })).toBeInTheDocument();
    });

    it('abre o gerenciamento de usuarios para ADMIN', async () => {
        iniciarSessao('ADMIN');
        window.location.hash = '#/admin/usuarios';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/usuarios', expect.anything());
    });

    it('abre o painel de ADMIN apos o login com Corretoras como opcao independente', async () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        window.location.hash = '#/login';
        const { container } = render(<App />);
        fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'admin@teste.local' } });
        fireEvent.change(container.querySelector('[name="password"]'), { target: { value: 'senha-ficticia' } });
        fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

        await screen.findByRole('heading', { name: 'Usuários' });
        const menu = within(screen.getByRole('navigation', { name: 'Menu do administrador' }));
        expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual(['Administração', 'Corretoras']);
        expect(menu.getByRole('link', { name: 'Administração' })).toHaveAttribute('aria-current', 'page');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/stats', expect.anything());
        fireEvent.click(menu.getByRole('link', { name: 'Corretoras' }));
        expect(await screen.findByRole('heading', { name: 'Adicionar Corretora' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Corretoras' })).toHaveAttribute('aria-current', 'page');
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/corretoras', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it.each(['/dashboard', '/carteiras', '/acoes'])('encaminha ADMIN de %s para a Administracao', async (rota) => {
        iniciarSessao('ADMIN');
        window.location.hash = '#' + rota;
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/admin/usuarios');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/stats', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/carteiras/principal', expect.anything());
    });

    it('abre o cadastro quando ADMIN acessa a URL comum de corretoras', async () => {
        iniciarSessao('ADMIN');
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Adicionar Corretora' })).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(window.location.hash).toBe('#/admin/corretoras');
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it('permite a consulta de corretoras para USER sem formulario de cadastro', async () => {
        iniciarSessao('USER');
        window.location.hash = '#/corretoras';
        render(<App />);
        expect(await screen.findByRole('heading', { name: 'Corretoras cadastradas' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Adicionar por CNPJ:')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Adicionar' })).not.toBeInTheDocument();
        expect(http).toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });

    it.each(['/admin/usuarios', '/admin/corretoras'])('nega a URL administrativa %s para USER sem fazer consultas administrativas', async (rota) => {
        iniciarSessao('USER');
        window.location.hash = '#' + rota;
        render(<App />);
        expect(await screen.findByRole('alert')).toHaveTextContent('Esta área é exclusiva para administradores.');
        expect(http).not.toHaveBeenCalledWith('/api/usuarios', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/corretoras', expect.anything());
        expect(http).not.toHaveBeenCalledWith('/api/dashboard/corretoras', expect.anything());
    });
});
