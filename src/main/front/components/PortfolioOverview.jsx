import React from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

const formatCurrency = (value, currency = 'BRL') => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'BRL'
});

const formatPercentage = (value) => {
    const numericValue = Number(value || 0);
    return `${numericValue > 0 ? '+' : ''}${numericValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}%`;
};

const performanceClass = (value) => {
    if (Number(value) > 0) return 'performance-positive';
    if (Number(value) < 0) return 'performance-negative';
    return 'performance-neutral';
};

const normalizeCurrency = (currency) => (currency === 'USD' ? 'USD' : 'BRL');

const formatCompactNumber = (value) => Number(value || 0).toLocaleString('pt-BR', {
    notation: 'compact',
    maximumFractionDigits: 1
});

const chartDateKey = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const chartDateLabel = (value) => new Date(`${value}T12:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const buildPortfolioSummary = (positions, saldoEmConta) => {
    const totals = new Map([['BRL', {
        moeda: 'BRL',
        investido: 0,
        patrimonio: Number(saldoEmConta || 0),
        resultado: 0
    }]]);

    positions.forEach((position) => {
        const moeda = normalizeCurrency(position.moeda);
        const total = totals.get(moeda) || { moeda, investido: 0, patrimonio: 0, resultado: 0 };
        total.investido += Number(position.valorInvestido || 0);
        total.patrimonio += Number(position.posicao || 0);
        total.resultado += Number(position.lucroPrejuizo || 0);
        totals.set(moeda, total);
    });

    return ['BRL', 'USD']
        .map((moeda) => totals.get(moeda))
        .filter(Boolean)
        .map((total) => ({
            ...total,
            rentabilidade: total.investido > 0 ? (total.resultado / total.investido) * 100 : 0
        }));
};

const buildEvolutionData = (transactions, positions, saldoEmConta) => {
    const records = transactions
        .filter((transaction) => chartDateKey(transaction.dataHora))
        .sort((first, second) => new Date(first.dataHora) - new Date(second.dataHora));

    if (records.length === 0) return { points: [], currencies: [] };

    const currencies = new Set(['BRL']);
    records.forEach((transaction) => currencies.add(normalizeCurrency(transaction.moeda)));
    positions.forEach((position) => currencies.add(normalizeCurrency(position.moeda)));

    const totals = Object.fromEntries([...currencies].map((currency) => [currency, {
        compras: 0,
        vendas: 0,
        aportes: 0
    }]));
    records.forEach((transaction) => {
        const total = Number(transaction.valorTotal || 0);
        const currency = normalizeCurrency(transaction.moeda);
        if (transaction.tipo === 'COMPRA') totals[currency].compras += total;
        if (transaction.tipo === 'VENDA') totals[currency].vendas += total;
        if (transaction.tipo === 'APORTE') totals[currency].aportes += total;
    });

    const states = Object.fromEntries([...currencies].map((currency) => {
        const movement = totals[currency];
        const saldoInicial = (currency === 'BRL' ? Number(saldoEmConta || 0) : 0)
            + movement.compras - movement.vendas - movement.aportes;
        return [currency, { saldo: saldoInicial, lotes: new Map() }];
    }));

    const valueAtCost = (state) => state.saldo + [...state.lotes.values()]
        .reduce((total, lot) => total + lot.custo, 0);
    const pointFromStates = (label) => Object.fromEntries([
        ['label', label],
        ...[...currencies].map((currency) => [currency, valueAtCost(states[currency])])
    ]);

    const points = [pointFromStates('Início')];
    const recordsByDate = records.reduce((groups, transaction) => {
        const date = chartDateKey(transaction.dataHora);
        groups.set(date, [...(groups.get(date) || []), transaction]);
        return groups;
    }, new Map());

    recordsByDate.forEach((dailyTransactions, date) => {
        dailyTransactions.forEach((transaction) => {
            const currency = normalizeCurrency(transaction.moeda);
            const state = states[currency];
            const total = Number(transaction.valorTotal || 0);
            const quantity = Number(transaction.quantidade || 0);

            if (transaction.tipo === 'APORTE') {
                state.saldo += total;
                return;
            }

            const lotKey = transaction.ticker || 'ATIVO';
            const lot = state.lotes.get(lotKey) || { quantidade: 0, custo: 0 };
            if (transaction.tipo === 'COMPRA') {
                state.saldo -= total;
                lot.quantidade += quantity;
                lot.custo += total;
                state.lotes.set(lotKey, lot);
                return;
            }

            const custoVendido = lot.quantidade > 0
                ? lot.custo * Math.min(quantity, lot.quantidade) / lot.quantidade
                : total;
            state.saldo += total;
            lot.quantidade = Math.max(0, lot.quantidade - quantity);
            lot.custo = Math.max(0, lot.custo - custoVendido);
            if (lot.quantidade === 0) {
                state.lotes.delete(lotKey);
            } else {
                state.lotes.set(lotKey, lot);
            }
        });
        points.push(pointFromStates(chartDateLabel(date)));
    });

    const positionValues = Object.fromEntries([...currencies].map((currency) => [currency, 0]));
    positions.forEach((position) => {
        const currency = normalizeCurrency(position.moeda);
        positionValues[currency] += Number(position.posicao || 0);
    });
    points.push(Object.fromEntries([
        ['label', 'Hoje'],
        ...[...currencies].map((currency) => [currency, states[currency].saldo + positionValues[currency]])
    ]));

    return {
        points,
        currencies: ['BRL', 'USD'].filter((currency) => currencies.has(currency))
    };
};

const SummaryValues = ({ summary, field }) => (
    <div className="portfolio-metric-values">
        {summary.map((item) => {
            const value = item[field];
            const isPercentage = field === 'rentabilidade';
            return (
                <strong key={item.moeda} className={field === 'resultado' ? performanceClass(value) : ''}>
                    {isPercentage ? formatPercentage(value) : formatCurrency(value, item.moeda)}
                </strong>
            );
        })}
    </div>
);

const EvolutionTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
        <div className="chart-tooltip evolution-tooltip">
            <strong>{label}</strong>
            {payload.map((item) => (
                <span key={item.dataKey}>{formatCurrency(item.value, item.dataKey)}</span>
            ))}
        </div>
    );
};

const PortfolioOverview = ({ positions, transactions, saldoEmConta }) => {
    const summary = buildPortfolioSummary(positions, saldoEmConta);
    const evolution = buildEvolutionData(transactions, positions, saldoEmConta);

    return (
        <>
            <section className="dashboard-cards carteira-summary" aria-label="Resumo financeiro da carteira">
                <article className="card">
                    <span className="card-label">Valor investido</span>
                    <SummaryValues summary={summary} field="investido" />
                    <p>Preço médio acumulado das posições abertas.</p>
                </article>
                <article className="card">
                    <span className="card-label">Patrimônio atual</span>
                    <SummaryValues summary={summary} field="patrimonio" />
                    <p>Posições na cotação atual e saldo disponível.</p>
                </article>
                <article className="card">
                    <span className="card-label">Lucro / prejuízo</span>
                    <SummaryValues summary={summary} field="resultado" />
                    <p>Diferença entre o valor atual e o investido.</p>
                </article>
                <article className="card">
                    <span className="card-label">Rentabilidade</span>
                    <SummaryValues summary={summary} field="rentabilidade" />
                    <p>Resultado percentual das posições abertas.</p>
                </article>
            </section>

            <section className="dashboard-section chart-section portfolio-evolution">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Histórico da carteira</p>
                        <h3>Evolução patrimonial</h3>
                    </div>
                </div>
                {evolution.points.length > 0 ? (
                    <div className="chart-canvas">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={evolution.points} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#e4ece9" strokeDasharray="3 3" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={formatCompactNumber} />
                                <Tooltip content={<EvolutionTooltip />} />
                                <Legend formatter={(value) => (value === 'BRL' ? 'Brasil (BRL)' : 'EUA (USD)')} />
                                {evolution.currencies.map((currency, index) => (
                                    <Area
                                        key={currency}
                                        type="monotone"
                                        dataKey={currency}
                                        stroke={index === 0 ? '#0b7b67' : '#3478c6'}
                                        fill={index === 0 ? '#0b7b67' : '#3478c6'}
                                        fillOpacity={0.12}
                                        strokeWidth={2.5}
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="chart-empty">Registre um aporte, uma compra ou uma venda para iniciar sua evolução.</div>
                )}
                <p className="portfolio-chart-note">Os pontos históricos usam as movimentações registradas; “Hoje” considera as cotações mais recentes.</p>
            </section>
        </>
    );
};

export default PortfolioOverview;
