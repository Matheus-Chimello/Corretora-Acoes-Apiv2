import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { hasRole } from '../services/auth';
import { getNomeCorretora } from '../services/corretoras';

const formatCurrency = (value, currency = 'BRL') => Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'BRL'
});

const getErrorMessage = async (response, fallback) => {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
};

const Acoes = () => {
    const [catalogo, setCatalogo] = useState([]);
    const [posicoes, setPosicoes] = useState([]);
    const [corretoras, setCorretoras] = useState([]);
    const [cadastro, setCadastro] = useState({ ticker: '', mercado: 'BR', corretoraId: '' });
    const [compra, setCompra] = useState({ acaoId: '', quantidade: '1' });
    const [venda, setVenda] = useState({ acaoId: '', quantidade: '' });
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [vendaAberta, setVendaAberta] = useState(false);
    const isAdmin = hasRole('ADMIN');
    const isInvestor = hasRole('USER');

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        try {
            const requisicoes = [
                apiFetch('/acoes'),
                apiFetch('/corretoras'),
                isInvestor ? apiFetch('/acoes/minhas') : Promise.resolve(null)
            ];
            const [catalogoResponse, corretorasResponse, posicoesResponse] = await Promise.all(requisicoes);

            if (!catalogoResponse.ok || !corretorasResponse.ok) {
                throw new Error('Não foi possível carregar o catálogo de ações.');
            }

            setCatalogo(await catalogoResponse.json());
            setCorretoras((await corretorasResponse.json()).filter((corretora) => corretora.validadaNaCvm === true));

            if (posicoesResponse) {
                if (!posicoesResponse.ok) {
                    throw new Error(await getErrorMessage(posicoesResponse, 'Não foi possível carregar sua carteira.'));
                }
                setPosicoes(await posicoesResponse.json());
            } else {
                setPosicoes([]);
            }
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

            setCadastro({ ticker: '', mercado: 'BR', corretoraId: '' });
            setMensagem({ tipo: 'success', texto: 'Ativo cadastrado no catálogo com sucesso.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const comprarAcao = async (event) => {
        event.preventDefault();
        setMensagem({ tipo: '', texto: '' });

        try {
            if (!compra.acaoId || Number(compra.quantidade) <= 0) {
                throw new Error('Selecione uma ação e informe uma quantidade válida.');
            }
            const response = await apiFetch(`/acoes/${compra.acaoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantidade: compra.quantidade })
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível concluir a compra.'));
            }

            setCompra({ acaoId: '', quantidade: '1' });
            setMensagem({ tipo: 'success', texto: 'Compra registrada na sua carteira.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const venderAcao = async (event) => {
        event.preventDefault();
        const posicao = posicoes.find((item) => item.id === venda.acaoId);

        try {
            if (!posicao || Number(venda.quantidade) <= 0) {
                throw new Error('Selecione uma posição e informe uma quantidade válida.');
            }
            if (Number(venda.quantidade) > Number(posicao.quantidadeTotal)) {
                throw new Error('A quantidade informada é maior que a disponível na sua carteira.');
            }

            const response = await apiFetch(`/acoes/${encodeURIComponent(posicao.ticker)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantidade: venda.quantidade })
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível concluir a venda.'));
            }

            setVenda({ acaoId: '', quantidade: '' });
            setVendaAberta(false);
            setMensagem({ tipo: 'success', texto: 'Venda registrada e saldo atualizado.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    return (
        <div className="container">
            <Navbar title={isAdmin ? 'Catálogo de Ações' : 'Negociação de Ações'} />

            {isAdmin && (
                <section className="form-panel">
                    <h3>Cadastrar Ativo no Catálogo</h3>
                    <form onSubmit={cadastrarAcao} className="app-form">
                        <div className="field-group">
                            <label>Ticker</label>
                            <input
                                type="text"
                                name="ticker"
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
                        <div className="field-group">
                            <label>Corretora validada</label>
                            <select
                                value={cadastro.corretoraId}
                                onChange={(event) => setCadastro({ ...cadastro, corretoraId: event.target.value })}
                                className="form-input"
                            >
                                <option value="">Selecione a corretora...</option>
                                {corretoras.map((corretora) => (
                                    <option key={corretora.id} value={corretora.id}>{getNomeCorretora(corretora)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Cadastrar ativo</button>
                        </div>
                    </form>
                    {corretoras.length === 0 && <p className="alert alert-warning">Cadastre uma corretora validada antes de incluir ações.</p>}
                </section>
            )}

            {isInvestor && (
                <section className="form-panel">
                    <h3>Comprar Ação</h3>
                    <form onSubmit={comprarAcao} className="app-form">
                        <div className="field-group">
                            <label>Ativo</label>
                            <select
                                value={compra.acaoId}
                                onChange={(event) => setCompra({ ...compra, acaoId: event.target.value })}
                                className="form-input"
                            >
                                <option value="">Selecione uma ação...</option>
                                {catalogo.map((acao) => (
                                    <option key={acao.id} value={acao.id}>
                                        {acao.ticker} - {acao.nomeEmpresa || 'Empresa não informada'} ({formatCurrency(acao.cotacaoAtual, acao.moeda)})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="field-group">
                            <label>Quantidade</label>
                            <input
                                type="number"
                                value={compra.quantidade}
                                onChange={(event) => setCompra({ ...compra, quantidade: event.target.value })}
                                min="0.01"
                                step="0.01"
                                className="form-input"
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Comprar</button>
                            <button type="button" className="btn btn-danger" onClick={() => setVendaAberta(true)} disabled={posicoes.length === 0}>Vender</button>
                        </div>
                    </form>
                </section>
            )}

            {mensagem.texto && <p className={`alert ${mensagem.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>{mensagem.texto}</p>}

            <section className="table-container">
                <h3>Ativos Disponíveis</h3>
                {catalogo.length > 0 ? (
                    <table id="catalogoAcoes">
                        <thead>
                        <tr>
                            <th>Ticker</th>
                            <th>Empresa</th>
                            <th>Corretora</th>
                            <th>Mercado</th>
                            <th>Cotação</th>
                            <th>Atualizacao</th>
                        </tr>
                        </thead>
                        <tbody>
                        {catalogo.map((acao) => (
                            <tr key={acao.id}>
                                <td><span className="ticker-badge">{acao.ticker}</span></td>
                                <td>{acao.nomeEmpresa || '---'}</td>
                                <td>{getNomeCorretora(acao.corretoraRelacionada)}</td>
                                <td>{acao.mercado}</td>
                                <td className="price">{formatCurrency(acao.cotacaoAtual, acao.moeda)}</td>
                                <td>{acao.dataHoraCotacao ? new Date(acao.dataHoraCotacao).toLocaleString('pt-BR') : '---'}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                ) : <div className="empty-state"><p>Nenhum ativo cadastrado no catálogo.</p></div>}
            </section>

            {isInvestor && (
                <section className="table-container">
                    <h3>Minhas Posições</h3>
                    {posicoes.length > 0 ? (
                        <table id="minhasPosicoes">
                            <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Quantidade</th>
                                <th>Preço médio</th>
                                <th>Cotação</th>
                                <th>Posição atual</th>
                            </tr>
                            </thead>
                            <tbody>
                            {posicoes.map((acao) => (
                                <tr key={acao.posicaoId}>
                                    <td><span className="ticker-badge">{acao.ticker}</span></td>
                                    <td>{acao.quantidadeTotal}</td>
                                    <td className="price">{formatCurrency(acao.precoMedio, acao.moeda)}</td>
                                    <td className="price">{formatCurrency(acao.cotacaoAtual, acao.moeda)}</td>
                                    <td className="price">{formatCurrency(acao.posicao, acao.moeda)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    ) : <div className="empty-state"><p>Você ainda não possui ações na carteira.</p></div>}
                </section>
            )}

            {vendaAberta && (
                <div className="modal-overlay">
                    <div className="modal-panel">
                        <div className="modal-header">
                            <h3>Vender Ação</h3>
                            <button type="button" onClick={() => setVendaAberta(false)} className="modal-close" aria-label="Fechar venda">x</button>
                        </div>
                        <form onSubmit={venderAcao} className="modal-form">
                            <div className="field-group">
                                <label>Posição</label>
                                <select
                                    value={venda.acaoId}
                                    onChange={(event) => setVenda({ ...venda, acaoId: event.target.value })}
                                    className="form-input"
                                >
                                    <option value="">Selecione a ação...</option>
                                    {posicoes.map((acao) => (
                                        <option key={acao.posicaoId} value={acao.id}>{acao.ticker} ({acao.quantidadeTotal} disponível)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="field-group">
                                <label>Quantidade</label>
                                <input
                                    type="number"
                                    value={venda.quantidade}
                                    onChange={(event) => setVenda({ ...venda, quantidade: event.target.value })}
                                    min="0.01"
                                    step="0.01"
                                    className="form-input"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setVendaAberta(false)} className="btn btn-secondary">Cancelar</button>
                                <button type="submit" className="btn btn-danger">Confirmar venda</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Acoes;
