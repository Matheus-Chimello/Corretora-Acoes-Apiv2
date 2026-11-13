import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PortfolioOverview from './PortfolioOverview';

vi.mock('recharts', () => {
    const Wrapper = ({ children }) => <div>{children}</div>;
    return {
        Area: () => null, AreaChart: ({ data, children }) => <div data-testid="evolution" data-points={JSON.stringify(data)}>{children}</div>,
        CartesianGrid: () => null, Legend: () => null, ResponsiveContainer: Wrapper,
        Tooltip: () => null, XAxis: () => null, YAxis: () => null
    };
});

describe('resumo financeiro', () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('exibe valores, rentabilidade e saldo por moeda', () => {
        render(<PortfolioOverview saldoEmConta={50} transactions={[]} positions={[
            { moeda: 'BRL', valorInvestido: 100, posicao: 120, lucroPrejuizo: 20 },
            { moeda: 'USD', valorInvestido: 100, posicao: 90, lucroPrejuizo: -10 }
        ]} />);
        const resumo = screen.getByRole('region', { name: 'Resumo financeiro da carteira' });
        const investimentos = within(resumo).getByText('Valor investido').closest('article');
        const patrimonio = within(resumo).getByText('Patrimônio atual').closest('article');
        const rentabilidade = within(resumo).getByText('Rentabilidade').closest('article');
        expect(investimentos).toHaveTextContent('R$ 100,00');
        expect(investimentos).toHaveTextContent('US$ 100,00');
        expect(patrimonio).toHaveTextContent('R$ 170,00');
        expect(patrimonio).toHaveTextContent('US$ 90,00');
        expect(rentabilidade).toHaveTextContent('+20,00%');
        expect(rentabilidade).toHaveTextContent('-10,00%');
        expect(screen.getByText(/Registre um aporte/)).toBeInTheDocument();
    });

    it('reconstitui a evolucao usando aportes, compras, vendas e cotacao atual', () => {
        const transactions = [
            { tipo: 'VENDA', ticker: 'PETR4', moeda: 'BRL', quantidade: 1, valorTotal: 60, dataHora: '2026-01-03T12:00:00' },
            { tipo: 'APORTE', moeda: 'BRL', valorTotal: 200, dataHora: '2026-01-01T12:00:00' },
            { tipo: 'COMPRA', ticker: 'PETR4', moeda: 'BRL', quantidade: 2, valorTotal: 100, dataHora: '2026-01-02T12:00:00' }
        ];
        render(<PortfolioOverview saldoEmConta={160} transactions={transactions} positions={[
            { moeda: 'BRL', valorInvestido: 50, posicao: 60, lucroPrejuizo: 10 }
        ]} />);
        const pontos = JSON.parse(screen.getByTestId('evolution').getAttribute('data-points'));
        expect(pontos.map((ponto) => ponto.BRL)).toEqual([0, 200, 200, 210, 220]);
        expect(pontos.at(-1).label).toBe('Hoje');
    });

    it('filtra 30 ou 90 dias com o patrimônio de abertura de cada moeda e volta ao histórico completo', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 13, 12));
        const transactions = [
            { tipo: 'APORTE', moeda: 'BRL', valorTotal: 500, dataHora: '2026-08-15T12:00:00' },
            { tipo: 'APORTE', moeda: 'BRL', valorTotal: 100, dataHora: '2026-08-16T12:00:00' },
            { tipo: 'APORTE', moeda: 'USD', valorTotal: 70, dataHora: '2026-09-20T12:00:00' },
            { tipo: 'COMPRA', ticker: 'PETR4', moeda: 'BRL', quantidade: 2, valorTotal: 200, dataHora: '2026-10-14T12:00:00' },
            { tipo: 'VENDA', ticker: 'PETR4', moeda: 'BRL', quantidade: 1, valorTotal: 140, dataHora: '2026-10-15T12:00:00' }
        ];
        render(<PortfolioOverview saldoEmConta={540} saldoEmDolar={70} transactions={transactions}
            positions={[{ moeda: 'BRL', valorInvestido: 100, posicao: 125 }]} />);

        const periodos = within(screen.getByRole('group', { name: 'Período do gráfico' }));
        const lerPontos = () => JSON.parse(screen.getByTestId('evolution').getAttribute('data-points'));
        const historico = lerPontos();
        expect(periodos.getByRole('button', { name: 'Histórico completo' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(periodos.getByRole('button', { name: '30 dias' }));
        expect(lerPontos()).toEqual([
            { label: 'Início (15/10)', BRL: 600, USD: 70 },
            { label: '15/10', BRL: 640, USD: 70 },
            { label: 'Hoje', BRL: 665, USD: 70 }
        ]);

        fireEvent.click(periodos.getByRole('button', { name: '90 dias' }));
        expect(lerPontos()).toEqual([
            { label: 'Início (16/08)', BRL: 500, USD: 0 },
            { label: '16/08', BRL: 600, USD: 0 },
            { label: '20/09', BRL: 600, USD: 70 },
            { label: '14/10', BRL: 600, USD: 70 },
            { label: '15/10', BRL: 640, USD: 70 },
            { label: 'Hoje', BRL: 665, USD: 70 }
        ]);

        fireEvent.click(periodos.getByRole('button', { name: 'Histórico completo' }));
        expect(lerPontos()).toEqual(historico);
    });

    it('mostra o patrimônio de abertura mesmo sem movimentações no período e após uma transferência entre corretoras', () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 10, 13, 12));
        const transactions = [
            { tipo: 'APORTE', moeda: 'BRL', valorTotal: 200, dataHora: '2026-10-01T12:00:00' },
            { tipo: 'COMPRA', ticker: 'PETR4', moeda: 'BRL', quantidade: 2, valorTotal: 100, dataHora: '2026-10-02T12:00:00' },
            { tipo: 'TRANSFERENCIA_SAIDA', ticker: 'PETR4', moeda: 'BRL', quantidade: 2, valorTotal: 100, dataHora: '2026-10-03T12:00:00' },
            { tipo: 'TRANSFERENCIA_ENTRADA', ticker: 'PETR4', moeda: 'BRL', quantidade: 2, valorTotal: 100, dataHora: '2026-10-03T12:00:01' }
        ];
        render(<PortfolioOverview saldoEmConta={100} transactions={transactions}
            positions={[{ moeda: 'BRL', valorInvestido: 100, posicao: 130 }]} />);

        fireEvent.click(screen.getByRole('button', { name: '30 dias' }));

        const pontos = JSON.parse(screen.getByTestId('evolution').getAttribute('data-points'));
        expect(pontos).toEqual([
            { label: 'Início (15/10)', BRL: 200 },
            { label: 'Hoje', BRL: 230 }
        ]);
    });

    it('inclui o caixa em dólares no patrimônio e no gráfico mesmo sem posições', () => {
        const transactions = [{ tipo: 'APORTE', moeda: 'USD', valorTotal: 25, dataHora: '2026-11-12T12:00:00' }];
        render(<PortfolioOverview saldoEmConta={50} saldoEmDolar={25} transactions={transactions} positions={[]} />);
        const patrimonio = screen.getByText('Patrimônio atual').closest('article');
        expect(patrimonio).toHaveTextContent('R$ 50,00');
        expect(patrimonio).toHaveTextContent('US$ 25,00');
        const pontos = JSON.parse(screen.getByTestId('evolution').getAttribute('data-points'));
        expect(pontos.map(ponto => ponto.USD)).toEqual([0, 25, 25]);
    });

    it('ignora datas invalidas e trata valores ausentes sem dividir por zero', () => {
        render(<PortfolioOverview saldoEmConta={null} transactions={[{ tipo: 'COMPRA', dataHora: 'invalida' }]} positions={[{ moeda: 'BRL' }]} />);
        expect(screen.getByText(/Registre um aporte/)).toBeInTheDocument();
        const resumo = screen.getByRole('region', { name: 'Resumo financeiro da carteira' });
        expect(within(resumo).getByText('Rentabilidade').closest('article')).toHaveTextContent('0,00%');
        expect(within(resumo).getByText('Lucro / prejuízo').closest('article')).toHaveTextContent('R$ 0,00');
    });

    it('reconstitui uma venda total e mantem moedas separadas', () => {
        const transactions = [
            { tipo: 'COMPRA', ticker: 'IBM', moeda: 'USD', quantidade: 2, valorTotal: 100, dataHora: '2026-01-01T12:00:00' },
            { tipo: 'VENDA', ticker: 'IBM', moeda: 'USD', quantidade: 2, valorTotal: 120, dataHora: '2026-01-02T12:00:00' }
        ];
        render(<PortfolioOverview saldoEmConta={0} transactions={transactions} positions={[]} />);
        const pontos = JSON.parse(screen.getByTestId('evolution').getAttribute('data-points'));
        expect(pontos.at(-1).USD).toBe(0);
        expect(pontos.at(-1).BRL).toBe(0);
    });
});
