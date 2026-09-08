import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Bar,
    BarChart,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import Navbar from '../components/Navbar';
import PortfolioOverview from '../components/PortfolioOverview';
import { apiFetch } from '../services/api';

const CHART_COLORS = ['#0b7b67', '#e3a832', '#d64d69', '#3478c6', '#7a9e56', '#6b7280'];

const formatCurrency = (value, currency = 'BRL') => {
    const numericValue = Number(value || 0);
    return numericValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'BRL'
    });
};

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

const getNomeCorretora = (posicao) => (
    posicao?.corretoraRelacionada?.nomeFantasia
    || posicao?.corretoraRelacionada?.razaoSocial
    || 'Sem corretora'
);

const ChartTooltip = ({ active, payload, label, valueFormatter }) => {
    if (!active || !payload?.length) {
        return null;
    }

    const item = payload[0];
    const nome = label || item?.payload?.nome || item?.name || 'Dado do gráfico';

    return (
        <div className="chart-tooltip">
            <strong>{nome}</strong>
            <span>{valueFormatter(item.value)}</span>
        </div>
    );
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        corretorasCount: 0,
        acoesCount: 0,
        carteirasCount: 0,
        saldoAcao: 0
    });
    const [acoes, setAcoes] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [carteira, setCarteira] = useState({ saldoEmConta: 0 });
    const [transacoes, setTransacoes] = useState([]);

    useEffect(() => {
        Promise.all([
            apiFetch('/api/dashboard/stats'),
            apiFetch('/api/dashboard/acoes'),
            apiFetch('/acoes'),
            apiFetch('/carteiras/principal'),
            apiFetch('/carteiras/principal/transacoes')
        ])
            .then(async ([statsResponse, acoesResponse, catalogoResponse, carteiraResponse, transacoesResponse]) => {
                if (!statsResponse.ok || !acoesResponse.ok || !catalogoResponse.ok || !carteiraResponse.ok || !transacoesResponse.ok) {
                    throw new Error('Não foi possível carregar os dados do painel.');
                }

                const statsData = await statsResponse.json();
                const acoesData = await acoesResponse.json();
                const catalogoData = await catalogoResponse.json();
                const carteiraData = await carteiraResponse.json();
                const transacoesData = await transacoesResponse.json();
                setStats(statsData);
                setAcoes(Array.isArray(acoesData) ? acoesData : acoesData.acoes || []);
                setCatalogo(Array.isArray(catalogoData) ? catalogoData : []);
                setCarteira(carteiraData || { saldoEmConta: 0 });
                setTransacoes(Array.isArray(transacoesData) ? transacoesData : []);
            })
            .catch((error) => console.error('Erro ao buscar dados:', error));
    }, []);

    const totalPosicoes = acoes.reduce((total, acao) => total + Number(acao.posicao || 0), 0);
    const cotacoes = catalogo
        .filter((acao) => acao.cotacaoAtual !== null && acao.cotacaoAtual !== undefined)
        .map((acao) => ({ ticker: acao.ticker, cotacao: Number(acao.cotacaoAtual || 0) }))
        .sort((a, b) => b.cotacao - a.cotacao)
        .slice(0, 6);
    const acoesPorCorretora = Array.from(
        acoes.reduce((agrupadas, acao) => {
            const nome = getNomeCorretora(acao);
            agrupadas.set(nome, (agrupadas.get(nome) || 0) + 1);
            return agrupadas;
        }, new Map()),
        ([nome, total]) => ({ nome, total })
    );

    return (
        <div className="container">
            <Navbar title="Visão geral" />

            <main className="dashboard page-content">
                <section className="dashboard-intro">
                    <div>
                        <p className="eyebrow">Carteira de investimentos</p>
                        <h2>Patrimônio em ações</h2>
                        <p>Uma leitura objetiva das posições cadastradas na sua conta.</p>
                    </div>
                    <Link to="/carteiras" className="btn btn-secondary dashboard-link">Abrir carteira</Link>
                </section>

                <section className="dashboard-cards">
                    <Link to="/carteiras" className="card card-featured">
                        <span className="card-label">Posições abertas</span>
                        <div className="stat">{acoes.length}</div>
                        <p>Ativos atualmente presentes na carteira.</p>
                    </Link>

                    <Link to="/acoes" className="card">
                        <span className="card-label">Ações cadastradas</span>
                        <div className="stat">{catalogo.length}</div>
                        <p>Ativos disponíveis para consulta e negociação.</p>
                    </Link>

                    <Link to="/corretoras" className="card">
                        <span className="card-label">Corretoras</span>
                        <div className="stat">{stats.corretorasCount}</div>
                        <p>Instituições vinculadas à sua operação.</p>
                    </Link>
                </section>

                <PortfolioOverview
                    positions={acoes}
                    transactions={transacoes}
                    saldoEmConta={carteira.saldoEmConta}
                />

                <section className="analytics-grid" aria-label="Análises do catálogo">
                    <section className="dashboard-section chart-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Distribuição</p>
                                <h3>Posições por corretora</h3>
                            </div>
                        </div>
                        {acoesPorCorretora.length > 0 ? (
                            <div className="chart-canvas">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={acoesPorCorretora}
                                            dataKey="total"
                                            nameKey="nome"
                                            innerRadius="54%"
                                            outerRadius="78%"
                                            paddingAngle={3}
                                        >
                                            {acoesPorCorretora.map((item, index) => (
                                                <Cell key={item.nome} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip valueFormatter={(value) => `${value} ${value === 1 ? 'ação' : 'ações'}`} />} />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="chart-empty">Compre ações para visualizar a distribuição.</div>
                        )}
                    </section>

                    <section className="dashboard-section chart-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Cotações cadastradas</p>
                                <h3>Valor por ativo</h3>
                            </div>
                        </div>
                        {cotacoes.length > 0 ? (
                            <div className="chart-canvas">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cotacoes} margin={{ top: 18, right: 8, left: -12, bottom: 2 }}>
                                        <XAxis dataKey="ticker" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value}`} />
                                        <Tooltip content={<ChartTooltip valueFormatter={(value) => formatCurrency(value)} />} />
                                        <Bar dataKey="cotacao" fill="#0b7b67" maxBarSize={44} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="chart-empty">Cadastre ações para visualizar as cotações.</div>
                        )}
                    </section>
                </section>

                <section className="dashboard-grid">
                    <section className="dashboard-section">
                        <div className="section-heading">
                            <div>
                                <p className="eyebrow">Composição</p>
                                <h3>Posições em carteira</h3>
                            </div>
                            <Link to="/carteiras" className="text-link">Abrir carteira</Link>
                        </div>

                        {acoes.length > 0 ? (
                            <div className="position-list">
                                {acoes.slice(0, 5).map((acao) => {
                                    const position = Number(acao.posicao || 0);
                                    const share = totalPosicoes > 0 ? Math.min((position / totalPosicoes) * 100, 100) : 0;

                                    return (
                                        <Link to="/carteiras" className="position-row" key={acao.posicaoId || acao.id}>
                                            <span className="ticker-badge">{acao.ticker}</span>
                                            <span className="position-company">{acao.nomeEmpresa || 'Ação cadastrada'}</span>
                                            <div className="position-bar" aria-label={`${share.toFixed(1)}% da carteira`}>
                                                <span style={{ width: `${share}%` }} />
                                            </div>
                                            <span className="position-value">
                                                <strong>{formatCurrency(position, acao.moeda)}</strong>
                                                <small className={performanceClass(acao.lucroPrejuizo)}>
                                                    {formatCurrency(acao.lucroPrejuizo, acao.moeda)} ({formatPercentage(acao.rentabilidadePercentual)})
                                                </small>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="empty-state dashboard-empty">
                                <p>Nenhuma posição disponível para exibição.</p>
                                <Link to="/carteiras" className="text-link">Comprar ação</Link>
                            </div>
                        )}
                    </section>

                    <aside className="dashboard-aside">
                        <p className="eyebrow">Acesso rápido</p>
                        <h3>Gerencie sua operação</h3>
                        <Link to="/acoes" className="quick-action"><span>Ações</span><small>Consultar e cadastrar ativos</small></Link>
                        <Link to="/carteiras" className="quick-action"><span>Carteira</span><small>Posições, operações e aportes</small></Link>
                        <Link to="/corretoras" className="quick-action"><span>Corretoras</span><small>Instituições cadastradas</small></Link>
                    </aside>
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
