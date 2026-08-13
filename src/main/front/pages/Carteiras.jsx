import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { hasRole } from '../services/auth';
import { getNomeCorretora } from '../services/corretoras';

const formatCurrency = (value, currency = 'BRL') => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'BRL'
});

const Carteiras = () => {
    const [carteira, setCarteira] = useState(null);
    const [acoes, setAcoes] = useState([]);
    const [aporte, setAporte] = useState('');
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [isLoading, setIsLoading] = useState(false);
    const isInvestor = hasRole('USER');

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        setIsLoading(true);
        try {
            const [carteiraResponse, dashboardResponse] = await Promise.all([
                apiFetch('/carteiras/principal'),
                apiFetch('/api/dashboard/acoes')
            ]);
            if (!carteiraResponse.ok || !dashboardResponse.ok) {
                throw new Error('Não foi possível carregar a carteira.');
            }

            const carteiraData = await carteiraResponse.json();
            const dashboardData = await dashboardResponse.json();
            setCarteira(carteiraData);
            setAcoes(dashboardData.acoes || []);
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const realizarAporte = async (event) => {
        event.preventDefault();
        setMensagem({ tipo: '', texto: '' });

        try {
            if (Number(aporte) <= 0) {
                throw new Error('Informe um valor de aporte maior que zero.');
            }
            const response = await apiFetch('/carteiras/principal/aportes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valor: aporte })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Não foi possível registrar o aporte.');
            }

            setCarteira(await response.json());
            setAporte('');
            setMensagem({ tipo: 'success', texto: 'Aporte registrado com sucesso.' });
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const saldoAcao = Number(carteira?.saldoAcao || 0);
    const saldoEmConta = Number(carteira?.saldoEmConta || 0);
    const saldoTotal = saldoAcao + saldoEmConta;

    return (
        <div className="container">
            <Navbar title={isInvestor ? 'Minha Carteira' : 'Consulta de Carteiras'} />

            <main className="dashboard-cards carteira-summary">
                <article className="card">
                    <h2>Saldo em Ações</h2>
                    <p>Valor consolidado das suas posições.</p>
                    <div className="stat stat-money">{formatCurrency(saldoAcao)}</div>
                </article>
                <article className="card">
                    <h2>Saldo em Conta</h2>
                    <p>Disponível para novas compras.</p>
                    <div className="stat stat-money">{formatCurrency(saldoEmConta)}</div>
                </article>
                <article className="card">
                    <h2>Total da Carteira</h2>
                    <p>Saldo em conta somado às posições.</p>
                    <div className="stat stat-money">{formatCurrency(saldoTotal)}</div>
                </article>
            </main>

            {isInvestor ? (
                <section className="form-panel">
                    <h3>Adicionar Saldo</h3>
                    <form onSubmit={realizarAporte} className="app-form search-form">
                        <div className="field-group">
                            <label>Valor do aporte</label>
                            <input
                                type="number"
                                value={aporte}
                                onChange={(event) => setAporte(event.target.value)}
                                className="form-input"
                                min="0.01"
                                step="0.01"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={isLoading || !carteira}>Adicionar saldo</button>
                        </div>
                    </form>
                </section>
            ) : (
                <p className="alert alert-warning">O administrador mantém o catálogo e as corretoras. Operações financeiras pertencem aos investidores.</p>
            )}

            {mensagem.texto && <p className={`alert ${mensagem.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>{mensagem.texto}</p>}

            <section className="table-container">
                <h3>Minhas Posições</h3>
                {acoes.length > 0 ? (
                    <table id="minhaTabela">
                        <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Empresa</th>
                            <th>Corretora</th>
                            <th>Mercado</th>
                            <th>Quantidade</th>
                            <th>Cotação</th>
                            <th>Posição</th>
                        </tr>
                        </thead>
                        <tbody>
                        {acoes.map((acao) => (
                            <tr key={acao.posicaoId || acao.id}>
                                <td><span className="ticker-badge">{acao.ticker}</span></td>
                                <td>{acao.nomeEmpresa || '---'}</td>
                                <td>{getNomeCorretora(acao.corretoraRelacionada)}</td>
                                <td>{acao.mercado}</td>
                                <td>{acao.quantidadeTotal}</td>
                                <td className="price">{formatCurrency(acao.cotacaoAtual, acao.moeda)}</td>
                                <td className="price">{formatCurrency(acao.posicao, acao.moeda)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : <div className="empty-state"><p>Nenhuma posição cadastrada na carteira.</p></div>}
            </section>
        </div>
    );
};

export default Carteiras;
