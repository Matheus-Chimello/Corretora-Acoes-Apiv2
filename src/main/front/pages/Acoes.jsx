import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { correspondeAoFiltro, opcoesUnicas } from '../services/filtros';

const formatCurrency = (value, currency = 'BRL') => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'BRL'
});

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const getErrorMessage = async (response, fallback) => {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
};

const Acoes = () => {
    const [catalogo, setCatalogo] = useState([]);
    const [cadastro, setCadastro] = useState({ ticker: '', mercado: 'BR' });
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [filtrosTabela, setFiltrosTabela] = useState({
        ticker: '',
        empresa: '',
        mercado: '',
        atualizacao: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const response = await apiFetch('/acoes');
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível carregar o catálogo de ações.'));
            }
            setCatalogo(await response.json());
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const cadastrarAcao = async (event) => {
        event.preventDefault();
        setMensagem({ tipo: '', texto: '' });

        try {
            const response = await apiFetch('/acoes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cadastro)
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível cadastrar a ação.'));
            }

            setCadastro({ ticker: '', mercado: 'BR' });
            setMensagem({ tipo: 'success', texto: 'Ativo cadastrado no catálogo com sucesso.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const atualizarFiltroTabela = (campo, valor) => {
        setFiltrosTabela((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
    };

    const catalogoFiltrado = catalogo.filter((acao) => {
        const dataCotacao = acao.dataHoraCotacao ? new Date(acao.dataHoraCotacao) : null;
        return correspondeAoFiltro(filtrosTabela.ticker, [acao.ticker])
            && correspondeAoFiltro(filtrosTabela.empresa, [acao.nomeEmpresa])
            && correspondeAoFiltro(filtrosTabela.mercado, [acao.mercado])
            && correspondeAoFiltro(filtrosTabela.atualizacao, [
                toDateInputValue(acao.dataHoraCotacao),
                dataCotacao ? dataCotacao.toLocaleString('pt-BR') : ''
            ]);
    });
    const opcoesTicker = opcoesUnicas(catalogo.map((acao) => acao.ticker));
    const opcoesEmpresa = opcoesUnicas(catalogo.map((acao) => acao.nomeEmpresa));
    const opcoesAtualizacao = [...new Map(
        catalogo
            .filter((acao) => acao.dataHoraCotacao)
            .map((acao) => {
                const data = new Date(acao.dataHoraCotacao);
                return [toDateInputValue(acao.dataHoraCotacao), data.toLocaleDateString('pt-BR')];
            })
    ).entries()].sort(([primeiraData], [segundaData]) => segundaData.localeCompare(primeiraData));

    return (
        <div className="container">
            <Navbar title="Ações" />

            <main className="page-content">
                <section className="form-panel">
                    <h3>Cadastrar Ativo no Catálogo</h3>
                    <form onSubmit={cadastrarAcao} className="app-form">
                        <div className="field-group">
                            <label>Ticker</label>
                            <input
                                type="text"
                                value={cadastro.ticker}
                                onChange={(event) => setCadastro({ ...cadastro, ticker: event.target.value })}
                                placeholder="Ex: PETR4"
                                className="form-input"
                            />
                        </div>
                        <div className="field-group">
                            <label>Mercado</label>
                            <select
                                value={cadastro.mercado}
                                onChange={(event) => setCadastro({ ...cadastro, mercado: event.target.value })}
                                className="form-input"
                            >
                                <option value="BR">Brasil</option>
                                <option value="US">EUA</option>
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Cadastrar ativo</button>
                        </div>
                    </form>
                </section>

                {mensagem.texto && <p className={`alert ${mensagem.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>{mensagem.texto}</p>}

                <section className="table-container">
                    <div className="table-heading">
                        <div>
                            <p className="eyebrow">Catálogo</p>
                            <h3>Ativos disponíveis</h3>
                        </div>
                        <span className="table-count">{catalogoFiltrado.length} de {catalogo.length}</span>
                    </div>
                    {catalogo.length > 0 ? (
                        <>
                        <div className="table-filter-bar" role="group" aria-label="Filtros de ativos">
                            <select value={filtrosTabela.ticker} onChange={(event) => atualizarFiltroTabela('ticker', event.target.value)} aria-label="Filtrar ticker" className="column-filter">
                                <option value="">Todos os tickers</option>
                                {opcoesTicker.map((ticker) => <option key={ticker} value={ticker}>{ticker}</option>)}
                            </select>
                            <select value={filtrosTabela.empresa} onChange={(event) => atualizarFiltroTabela('empresa', event.target.value)} aria-label="Filtrar empresa" className="column-filter">
                                <option value="">Todas as empresas</option>
                                {opcoesEmpresa.map((empresa) => <option key={empresa} value={empresa}>{empresa}</option>)}
                            </select>
                            <select value={filtrosTabela.mercado} onChange={(event) => atualizarFiltroTabela('mercado', event.target.value)} aria-label="Filtrar mercado" className="column-filter">
                                <option value="">Todos os mercados</option>
                                <option value="BR">Brasil</option>
                                <option value="US">EUA</option>
                            </select>
                            <select value={filtrosTabela.atualizacao} onChange={(event) => atualizarFiltroTabela('atualizacao', event.target.value)} aria-label="Filtrar atualização" className="column-filter">
                                <option value="">Todas as atualizações</option>
                                {opcoesAtualizacao.map(([data, rotulo]) => <option key={data} value={data}>{rotulo}</option>)}
                            </select>
                        </div>
                        <table id="catalogoAcoes" className="catalog-table">
                            <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Empresa</th>
                                <th>Mercado</th>
                                <th className="table-number">Cotação</th>
                                <th>Atualização</th>
                            </tr>
                            </thead>
                            <tbody>
                            {catalogoFiltrado.map((acao) => (
                                <tr key={acao.id}>
                                    <td><span className="ticker-badge">{acao.ticker}</span></td>
                                    <td>{acao.nomeEmpresa || '---'}</td>
                                    <td>{acao.mercado}</td>
                                    <td className="price table-number">{formatCurrency(acao.cotacaoAtual, acao.moeda)}</td>
                                    <td>{acao.dataHoraCotacao ? new Date(acao.dataHoraCotacao).toLocaleString('pt-BR') : '---'}</td>
                                </tr>
                            ))}
                            {catalogoFiltrado.length === 0 && (
                                <tr><td colSpan="5" className="table-empty">Nenhum ativo encontrado.</td></tr>
                            )}
                            </tbody>
                        </table>
                        </>
                    ) : <div className="empty-state"><p>Nenhum ativo cadastrado no catálogo.</p></div>}
                </section>
            </main>
        </div>
    );
};

export default Acoes;
