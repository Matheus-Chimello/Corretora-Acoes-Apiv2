import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
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
    afterEach(cleanup);

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
