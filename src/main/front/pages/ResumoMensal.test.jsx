import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { http, renderWithRouter as render } from '../test/http';
import ResumoMensal from './ResumoMensal';

vi.mock('recharts', async () => {
    const React = await import('react');
    const DadosDoGrafico = React.createContext([]);
    const Wrapper = ({ children }) => <div>{children}</div>;
    return {
        Area: () => null,
        AreaChart: ({ data, children }) => <DadosDoGrafico.Provider value={data}>
            <div data-testid="monthly-evolution" data-points={JSON.stringify(data)}>{children}</div>
        </DadosDoGrafico.Provider>,
        CartesianGrid: () => null, ResponsiveContainer: Wrapper,
        Tooltip: ({ content }) => {
            const dados = React.useContext(DadosDoGrafico);
            const [ponto, setPonto] = React.useState(null);
            return <div aria-label="Inspeção do gráfico" tabIndex={0}
                onMouseEnter={() => setPonto(dados.find((item) => item.aportes > 0) || dados[0])}
                onMouseLeave={() => setPonto(null)} onFocus={() => setPonto(dados.at(-1))} onBlur={() => setPonto(null)}>
                {React.cloneElement(content, { active: Boolean(ponto), payload: ponto ? [{ payload: ponto }] : [], label: ponto?.label })}
            </div>;
        },
        XAxis: () => null, YAxis: ({ tickFormatter }) => <span aria-label="Escala do gráfico">{tickFormatter(5000)}</span>
    };
});

const transacoes = [
    { id: 't1', tipo: 'APORTE', moeda: 'BRL', valorTotal: 5000, dataHora: '2026-09-01T12:00:00' },
    { id: 't2', tipo: 'COMPRA', moeda: 'BRL', ticker: 'VALE3', nomeEmpresa: 'Vale', corretora: { id: 'c1' }, quantidade: 150, precoUnitario: 30, valorTotal: 4500, dataHora: '2026-09-02T12:00:00' },
    { id: 't3', tipo: 'APORTE', moeda: 'BRL', valorTotal: 1000, dataHora: '2026-10-15T12:00:00' },
    { id: 't4', tipo: 'COMPRA', moeda: 'BRL', ticker: 'PETR4', nomeEmpresa: 'Petrobras', corretora: { id: 'c1' }, quantidade: 25, precoUnitario: 30, valorTotal: 750, dataHora: '2026-10-18T12:00:00' },
    { id: 't5', tipo: 'VENDA', moeda: 'BRL', ticker: 'VALE3', nomeEmpresa: 'Vale', corretora: { id: 'c1' }, quantidade: 5, precoUnitario: 60, valorTotal: 300, dataHora: '2026-10-25T12:00:00' }
];
const posicoes = [
    { ticker: 'VALE3', moeda: 'BRL', quantidadeTotal: 145, precoMedio: 30, cotacaoAtual: 90, corretoraRelacionada: { id: 'c1' } },
    { ticker: 'PETR4', moeda: 'BRL', quantidadeTotal: 25, precoMedio: 30, cotacaoAtual: 100, corretoraRelacionada: { id: 'c1' } }
];

describe('resumo mensal da própria carteira', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 23, 12));
        http.mockImplementation(async (rota) => Response.json({
            '/carteiras/principal': { saldoEmConta: 1050, saldoEmDolar: 0 },
            '/carteiras/principal/transacoes': transacoes,
            '/carteiras/principal/posicoes': posicoes
        }[rota] ?? []));
    });
    afterEach(() => vi.useRealTimers());

    const abrirOutubro = async () => {
        const tela = render(<ResumoMensal />);
        await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
        fireEvent.change(screen.getByLabelText('Mês do resumo'), { target: { value: '2026-10' } });
        return tela;
    };

    it('fecha o mês sem tratar aportes ou vendas brutas como lucro e sem usar cotações atuais no passado', async () => {
        await abrirOutubro();
        const indicadores = within(screen.getByRole('region', { name: 'Indicadores do mês' }));
        const indicador = (nome) => indicadores.getByText(nome).closest('article');
        expect(indicador('Aportes do mês')).toHaveTextContent('R$ 1.000,00');
        expect(indicador('Compras')).toHaveTextContent('R$ 750,00');
        expect(indicador('Vendas')).toHaveTextContent('R$ 300,00');
        expect(indicador('Resultado do período')).toHaveTextContent('R$ 150,00');
        const fechamento = screen.getByRole('region', { name: 'Fechamento do mês' });
        expect(fechamento).toHaveTextContent('R$ 5.000,00');
        expect(fechamento).toHaveTextContent('R$ 6.150,00');
        expect(fechamento).toHaveTextContent('R$ 1.050,00');
        const tabela = within(screen.getByRole('table', { name: 'Movimentações do mês' }));
        expect(tabela.getAllByRole('row')).toHaveLength(4);
        expect(tabela.queryByText('02/09/2026')).not.toBeInTheDocument();
        expect(screen.getByText(/Histórico pelo custo das posições/)).toBeInTheDocument();
    });

    it('separa BRL de USD e preserva os fechamentos ao trocar de mês, inclusive na virada do mês', async () => {
        const movimentos = [...transacoes,
            { id: 'br-fim', tipo: 'APORTE', moeda: 'BRL', valorTotal: 5, dataHora: '2026-10-31T23:59:59' },
            { id: 'br-nov', tipo: 'APORTE', moeda: 'BRL', valorTotal: 200, dataHora: '2026-11-01T00:00:00' },
            { id: 'us-inicio', tipo: 'APORTE', moeda: 'USD', valorTotal: 1000, dataHora: '2026-10-01T00:00:00' },
            { id: 'us-compra', tipo: 'COMPRA', moeda: 'USD', ticker: 'AAPL', nomeEmpresa: 'Apple', corretora: { id: 'c1' }, quantidade: 0.5, precoUnitario: 200, valorTotal: 100, dataHora: '2026-10-15T12:00:00' },
            { id: 'us-venda', tipo: 'VENDA', moeda: 'USD', ticker: 'AAPL', nomeEmpresa: 'Apple', corretora: { id: 'c1' }, quantidade: 0.25, precoUnitario: 300, valorTotal: 75, dataHora: '2026-10-31T23:59:59' },
            { id: 'us-nov', tipo: 'APORTE', moeda: 'USD', valorTotal: 900, dataHora: '2026-11-01T00:00:00' }
        ];
        const padrao = http.getMockImplementation();
        http.mockImplementation(async (rota, options) => {
            if (rota === '/carteiras/principal') return Response.json({ saldoEmConta: 1255, saldoEmDolar: 1875 });
            if (rota.endsWith('/transacoes')) return Response.json(movimentos);
            if (rota.endsWith('/posicoes')) return Response.json([...posicoes,
                { ticker: 'AAPL', moeda: 'USD', quantidadeTotal: 0.25, precoMedio: 200, corretoraRelacionada: { id: 'c1' } }
            ]);
            return padrao(rota, options);
        });
        await abrirOutubro();
        const fechamento = screen.getByRole('region', { name: 'Fechamento do mês' });
        expect(fechamento).toHaveTextContent('R$ 6.155,00');
        fireEvent.click(screen.getByRole('button', { name: 'USD' }));
        expect(fechamento).toHaveTextContent('US$ 1.025,00');
        expect(fechamento).toHaveTextContent('US$ 975,00');
        expect(fechamento).toHaveTextContent('US$ 25,00');
        const tabela = within(screen.getByRole('table', { name: 'Movimentações do mês' }));
        expect(tabela.getAllByRole('row')).toHaveLength(4);
        expect(tabela.queryByText('PETR4 · Petrobras')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
        expect(screen.getByLabelText('Mês do resumo')).toHaveValue('2026-09');
        expect(screen.getByText('Nenhuma movimentação neste mês e nesta moeda.')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
        expect(fechamento).toHaveTextContent('US$ 1.025,00');
        fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
        expect(fechamento).toHaveTextContent('US$ 1.925,00');
        expect(fechamento).toHaveTextContent('US$ 900,00');
        expect(screen.getByRole('button', { name: 'Próximo mês' })).toBeDisabled();
        expect(http).toHaveBeenCalledTimes(3);
    });

    it('desenha a evolução a custo do mês e oculta gráfico, totais e valores das movimentações na privacidade', async () => {
        const tela = await abrirOutubro();
        const pontos = JSON.parse(screen.getByTestId('monthly-evolution').getAttribute('data-points'));
        expect(pontos).toEqual([
            { data: '2026-10-01', label: 'Início', patrimonio: 5000, aportes: 0 },
            { data: '2026-10-15', label: '15/10', patrimonio: 6000, aportes: 1000 },
            { data: '2026-10-18', label: '18/10', patrimonio: 6000, aportes: 0 },
            { data: '2026-10-25', label: '25/10', patrimonio: 6150, aportes: 0 },
            { data: '2026-10-31', label: '31/10', patrimonio: 6150, aportes: 0 }
        ]);
        tela.rerender(<ResumoMensal modoPrivacidade />);
        expect(screen.queryByTestId('monthly-evolution')).not.toBeInTheDocument();
        expect(screen.getByText('Gráfico oculto pelo modo privacidade.')).toBeInTheDocument();
        for (const valor of ['R$ 6.150,00', 'R$ 1.000,00', 'R$ 750,00', 'R$ 300,00']) {
            expect(screen.queryByText(valor)).not.toBeInTheDocument();
        }
    });

    it('exibe o patrimônio e identifica aportes ao inspecionar pontos do gráfico', async () => {
        await abrirOutubro();
        const inspecao = screen.getByLabelText('Inspeção do gráfico');
        fireEvent.mouseEnter(inspecao);
        expect(within(inspecao).getByText('R$ 6.000,00')).toBeInTheDocument();
        expect(within(inspecao).getByText(/Aportes:/)).toHaveTextContent('R$ 1.000,00');
        fireEvent.mouseLeave(inspecao);
        expect(within(inspecao).queryByText(/Aportes:/)).not.toBeInTheDocument();
        fireEvent.focus(inspecao);
        expect(within(inspecao).getByText('R$ 6.150,00')).toBeInTheDocument();
        expect(within(inspecao).queryByText(/Aportes:/)).not.toBeInTheDocument();
        fireEvent.blur(inspecao);
        expect(screen.getByLabelText('Escala do gráfico')).toHaveTextContent('R$ 5 mil');
    });

    it('transfere o custo médio entre corretoras sem movimentar caixa nem duplicar compras e vendas', async () => {
        const movimentos = [
            { id: 'a', tipo: 'APORTE', moeda: 'BRL', valorTotal: 1000, dataHora: '2026-09-01T12:00:00' },
            { id: 'b', tipo: 'COMPRA', moeda: 'BRL', ticker: 'PETR4', corretora: { id: 'c1' }, quantidade: 10, precoUnitario: 20, valorTotal: 200, dataHora: '2026-09-02T12:00:00' },
            { id: 'c', tipo: 'COMPRA', moeda: 'BRL', ticker: 'PETR4', corretora: { id: 'c2' }, quantidade: 5, precoUnitario: 40, valorTotal: 200, dataHora: '2026-09-03T12:00:00' },
            { id: 'd', tipo: 'TRANSFERENCIA_SAIDA', moeda: 'BRL', ticker: 'PETR4', corretora: { id: 'c1' }, quantidade: 5, precoUnitario: 20, valorTotal: 100, dataHora: '2026-10-01T12:00:00' },
            { id: 'e', tipo: 'TRANSFERENCIA_ENTRADA', moeda: 'BRL', ticker: 'PETR4', corretora: { id: 'c2' }, quantidade: 5, precoUnitario: 20, valorTotal: 100, dataHora: '2026-10-01T12:00:01' },
            { id: 'f', tipo: 'VENDA', moeda: 'BRL', ticker: 'PETR4', corretora: { id: 'c2' }, quantidade: 6, precoUnitario: 50, valorTotal: 300, dataHora: '2026-10-02T12:00:00' }
        ];
        http.mockImplementation(async (rota) => Response.json({
            '/carteiras/principal': { saldoEmConta: 900 },
            '/carteiras/principal/transacoes': movimentos,
            '/carteiras/principal/posicoes': [
                { ticker: 'PETR4', moeda: 'BRL', quantidadeTotal: 5, precoMedio: 20, corretoraRelacionada: { id: 'c1' } },
                { ticker: 'PETR4', moeda: 'BRL', quantidadeTotal: 4, precoMedio: 30, corretoraRelacionada: { id: 'c2' } }
            ]
        }[rota] ?? []));
        await abrirOutubro();
        const indicadores = within(screen.getByRole('region', { name: 'Indicadores do mês' }));
        expect(indicadores.getByText('Compras').closest('article')).toHaveTextContent('R$ 0,00');
        expect(indicadores.getByText('Vendas').closest('article')).toHaveTextContent('R$ 300,00');
        expect(indicadores.getByText('Resultado do período').closest('article')).toHaveTextContent('R$ 120,00');
        const fechamento = screen.getByRole('region', { name: 'Fechamento do mês' });
        expect(fechamento).toHaveTextContent('R$ 1.120,00');
        expect(fechamento).toHaveTextContent('R$ 900,00');
    });

    it.each([
        { nome: 'posição sem compra registrada', movimentos: [], posicoes: [{ ticker: 'PETR4', moeda: 'BRL', quantidadeTotal: 10, precoMedio: 20, corretoraRelacionada: { id: 'c1' } }] },
        { nome: 'venda sem a compra de origem', movimentos: [{ id: 'legada', tipo: 'VENDA', ticker: 'PETR4', moeda: 'BRL', corretora: { id: 'c1' }, quantidade: 1, precoUnitario: 30, valorTotal: 30, dataHora: '2026-10-03T12:00:00' }], posicoes: [] }
    ])('informa histórico insuficiente em vez de inventar patrimônio ou lucro para $nome', async (cenario) => {
        http.mockImplementation(async (rota) => Response.json({
            '/carteiras/principal': { saldoEmConta: 500 },
            '/carteiras/principal/transacoes': cenario.movimentos,
            '/carteiras/principal/posicoes': cenario.posicoes
        }[rota] ?? []));
        await abrirOutubro();
        expect(screen.getByRole('alert')).toHaveTextContent('O histórico disponível não permite reconstruir o patrimônio deste período.');
        const fechamento = within(screen.getByRole('region', { name: 'Fechamento do mês' }));
        expect(fechamento.getAllByText('Indisponível')).toHaveLength(3);
        expect(fechamento.getByText('R$ 500,00')).toBeInTheDocument();
        expect(screen.queryByTestId('monthly-evolution')).not.toBeInTheDocument();
    });

    it('mostra a falha na tela e permite recarregar sem exibir um resumo parcial', async () => {
        const padrao = http.getMockImplementation();
        let indisponivel = true;
        http.mockImplementation(async (rota, options) => rota.endsWith('/transacoes') && indisponivel
            ? Response.json({ message: 'Falha interna de teste' }, { status: 503 }) : padrao(rota, options));
        render(<ResumoMensal />);
        expect(await screen.findByRole('alert')).toHaveTextContent('O servidor está indisponível no momento.');
        expect(screen.queryByRole('region', { name: 'Indicadores do mês' })).not.toBeInTheDocument();
        indisponivel = false;
        fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
        expect(await screen.findByRole('region', { name: 'Fechamento do mês' })).toHaveTextContent('R$ 6.150,00');
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('trata conta sem movimentos e recusa mês vazio ou futuro', async () => {
        http.mockImplementation(async (rota) => Response.json(rota === '/carteiras/principal' ? { saldoEmConta: 0 } : []));
        await abrirOutubro();
        expect(screen.getByText('Nenhum patrimônio ou movimentação nesta moeda até o mês selecionado.')).toBeInTheDocument();
        const mes = screen.getByLabelText('Mês do resumo');
        for (const valor of ['', '2026-12']) {
            fireEvent.change(mes, { target: { value: valor } });
            expect(screen.getByRole('alert')).toHaveTextContent('Selecione um mês válido até o mês atual.');
            expect(screen.queryByRole('region', { name: 'Indicadores do mês' })).not.toBeInTheDocument();
        }
        fireEvent.change(mes, { target: { value: '2026-10' } });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('mostra resultado negativo quando vende toda a posição abaixo do custo médio', async () => {
        http.mockImplementation(async (rota) => Response.json({
            '/carteiras/principal': { saldoEmConta: 50 },
            '/carteiras/principal/posicoes': [],
            '/carteiras/principal/transacoes': [
                { id: 'a', tipo: 'APORTE', moeda: 'BRL', valorTotal: 100, dataHora: '2026-09-01T12:00:00' },
                { id: 'b', tipo: 'COMPRA', moeda: 'BRL', ticker: 'PETR4', quantidade: 2, precoUnitario: 50, valorTotal: 100, dataHora: '2026-09-02T12:00:00' },
                { id: 'c', tipo: 'VENDA', moeda: 'BRL', ticker: 'PETR4', quantidade: 2, precoUnitario: 25, valorTotal: 50, dataHora: '2026-10-01T12:00:00' }
            ]
        }[rota] ?? []));
        await abrirOutubro();
        const indicadores = within(screen.getByRole('region', { name: 'Indicadores do mês' }));
        const resultado = indicadores.getByText('Resultado do período').closest('article');
        expect(resultado).toHaveTextContent(/-\s*R\$\s*50,00/);
        expect(within(resultado).getByText(/50,00/)).toHaveClass('performance-negative');
    });
});
