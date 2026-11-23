import React from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const dinheiro = (valor, moeda) => valor.toLocaleString('pt-BR', { style: 'currency', currency: moeda });

function DicaDoGrafico({ active, payload, label, moeda }) {
    if (!active || !payload?.length) return null;
    const ponto = payload[0].payload;
    return <div className="chart-tooltip">
        <strong>{label}</strong>
        <span>{dinheiro(ponto.patrimonio, moeda)}</span>
        {ponto.aportes > 0 && <span>Aportes: {dinheiro(ponto.aportes, moeda)}</span>}
    </div>;
}

export default function EvolucaoMensal({ resumo, moeda, modoPrivacidade }) {
    const temHistorico = resumo.transacoes.length > 0 || resumo.evolucao.some((ponto) => ponto.patrimonio !== 0);
    return <section className="form-panel monthly-evolution" aria-labelledby="monthly-evolution-title">
        <h2 id="monthly-evolution-title">Evolução do patrimônio</h2>
        <p className="purchase-hint">Custo das ações + saldo em caixa · {moeda}</p>
        {modoPrivacidade ? <div className="chart-empty">Gráfico oculto pelo modo privacidade.</div>
            : !resumo.historicoCompleto ? <div className="chart-empty">Histórico insuficiente para reconstruir o patrimônio.</div>
                : temHistorico ? <div className="chart-canvas">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={resumo.evolucao} margin={{ top: 18, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={20} />
                        <YAxis width={78} axisLine={false} tickLine={false}
                            tickFormatter={(valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: moeda, notation: 'compact', maximumFractionDigits: 1 })} />
                        <Tooltip content={<DicaDoGrafico moeda={moeda} />} />
                        <Area type="stepAfter" dataKey="patrimonio" name="Patrimônio a custo"
                            stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.12} strokeWidth={2.5} />
                    </AreaChart>
                </ResponsiveContainer>
            </div> : <div className="chart-empty">Nenhum patrimônio ou movimentação nesta moeda até o mês selecionado.</div>}
    </section>;
}
