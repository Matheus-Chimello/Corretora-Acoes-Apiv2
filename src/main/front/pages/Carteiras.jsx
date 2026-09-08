import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { getNomeCorretora } from '../services/corretoras';
import { correspondeAoFiltro, opcoesUnicas } from '../services/filtros';

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

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

const performanceClass = (value) => {
    if (Number(value) > 0) return 'performance-positive';
    if (Number(value) < 0) return 'performance-negative';
    return 'performance-neutral';
};

const getErrorMessage = async (response, fallback) => {
    const data = await response.json().catch(() => ({}));
    return data.message || fallback;
};

const Carteiras = () => {
    const [carteira, setCarteira] = useState(null);
    const [posicoes, setPosicoes] = useState([]);
    const [catalogo, setCatalogo] = useState([]);
    const [corretoras, setCorretoras] = useState([]);
    const [transacoes, setTransacoes] = useState([]);
    const [aporte, setAporte] = useState('');
    const [compra, setCompra] = useState({ acaoId: '', corretoraId: '', quantidade: '1' });
    const [venda, setVenda] = useState({ posicaoId: '', quantidade: '', valorUnitario: '' });
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [atualizandoCotacoes, setAtualizandoCotacoes] = useState(false);
    const [vendaAberta, setVendaAberta] = useState(false);
    const [filtrosPosicoes, setFiltrosPosicoes] = useState({
        ticker: '',
        empresa: '',
        corretora: '',
        mercado: '',
        resultado: ''
    });
    const [filtrosTransacoes, setFiltrosTransacoes] = useState({
        tipo: '',
        ativo: '',
        corretora: '',
        data: ''
    });

    useEffect(() => {
        carregarDados();
    }, []);

    const carregarDados = async () => {
        setIsLoading(true);
        try {
            const responses = await Promise.all([
                apiFetch('/carteiras/principal'),
                apiFetch('/carteiras/principal/posicoes'),
                apiFetch('/acoes'),
                apiFetch('/corretoras'),
                apiFetch('/carteiras/principal/transacoes')
            ]);

            if (responses.some((response) => !response.ok)) {
                throw new Error('Não foi possível carregar os dados da carteira.');
            }

            const [carteiraData, posicoesData, catalogoData, corretorasData, transacoesData] = await Promise.all(
                responses.map((response) => response.json())
            );
            setCarteira(carteiraData);
            setPosicoes(posicoesData || []);
            setCatalogo(catalogoData || []);
            setCorretoras((corretorasData || []).filter((corretora) => corretora.validadaNaCvm === true));
            setTransacoes(transacoesData || []);
            return true;
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
            return false;
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
                throw new Error(await getErrorMessage(response, 'Não foi possível registrar o aporte.'));
            }

            setAporte('');
            setMensagem({ tipo: 'success', texto: 'Aporte registrado com sucesso.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const comprarAcao = async (event) => {
        event.preventDefault();
        setMensagem({ tipo: '', texto: '' });

        try {
            if (!compra.acaoId || !compra.corretoraId || Number(compra.quantidade) <= 0) {
                throw new Error('Selecione uma ação, uma corretora e informe uma quantidade válida.');
            }
            const response = await apiFetch(`/carteiras/principal/acoes/${compra.acaoId}/compras`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ corretoraId: compra.corretoraId, quantidade: compra.quantidade })
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível concluir a compra.'));
            }

            setCompra({ acaoId: '', corretoraId: '', quantidade: '1' });
            setMensagem({ tipo: 'success', texto: 'Compra registrada na carteira.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const abrirVenda = (posicao) => {
        setVenda({
            posicaoId: posicao.posicaoId,
            quantidade: '',
            valorUnitario: posicao.cotacaoAtual ? String(posicao.cotacaoAtual) : ''
        });
        setVendaAberta(true);
    };

    const venderAcao = async (event) => {
        event.preventDefault();
        const posicao = posicoes.find((item) => item.posicaoId === venda.posicaoId);

        try {
            if (!posicao || Number(venda.quantidade) <= 0 || Number(venda.valorUnitario) <= 0) {
                throw new Error('Informe uma quantidade e um valor unitário de venda válidos.');
            }
            if (Number(venda.quantidade) > Number(posicao.quantidadeTotal)) {
                throw new Error('A quantidade informada é maior que a disponível na sua carteira.');
            }

            const response = await apiFetch(`/carteiras/principal/posicoes/${venda.posicaoId}/vendas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantidade: venda.quantidade, valorUnitario: venda.valorUnitario })
            });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível concluir a venda.'));
            }

            setVenda({ posicaoId: '', quantidade: '', valorUnitario: '' });
            setVendaAberta(false);
            setMensagem({ tipo: 'success', texto: 'Venda registrada e saldo atualizado.' });
            carregarDados();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        }
    };

    const atualizarCotacoes = async () => {
        if (posicoes.length === 0) return;

        setMensagem({ tipo: '', texto: '' });
        setAtualizandoCotacoes(true);
        try {
            const response = await apiFetch('/carteiras/principal/atualizar-cotacoes', { method: 'PUT' });
            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Não foi possível atualizar as cotações.'));
            }

            const posicoesAtualizadas = await response.json();
            const dadosCarregados = await carregarDados();
            if (dadosCarregados) {
                setMensagem({
                    tipo: 'success',
                    texto: `${posicoesAtualizadas.length} ${posicoesAtualizadas.length === 1 ? 'posição atualizada' : 'posições atualizadas'} com as cotações mais recentes.`
                });
            }
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        } finally {
            setAtualizandoCotacoes(false);
        }
    };

    const posicaoEmVenda = posicoes.find((item) => item.posicaoId === venda.posicaoId);
    const atualizarFiltroPosicoes = (campo, valor) => {
        setFiltrosPosicoes((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
    };
    const atualizarFiltroTransacoes = (campo, valor) => {
        setFiltrosTransacoes((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
    };
    const posicoesFiltradas = posicoes.filter((acao) => {
        const resultado = Number(acao.lucroPrejuizo || 0);
        const correspondeResultado = !filtrosPosicoes.resultado
            || (filtrosPosicoes.resultado === 'positivo' && resultado > 0)
            || (filtrosPosicoes.resultado === 'negativo' && resultado < 0)
            || (filtrosPosicoes.resultado === 'neutro' && resultado === 0);
        return correspondeAoFiltro(filtrosPosicoes.ticker, [acao.ticker])
            && correspondeAoFiltro(filtrosPosicoes.empresa, [acao.nomeEmpresa])
            && correspondeAoFiltro(filtrosPosicoes.corretora, [getNomeCorretora(acao.corretoraRelacionada)])
            && correspondeAoFiltro(filtrosPosicoes.mercado, [acao.mercado])
            && correspondeResultado;
    });
    const transacoesFiltradas = transacoes.filter((transacao) => {
        const dataHora = transacao.dataHora ? new Date(transacao.dataHora) : null;
        return correspondeAoFiltro(filtrosTransacoes.tipo, [transacao.tipo])
            && correspondeAoFiltro(filtrosTransacoes.ativo, [transacao.ticker, transacao.nomeEmpresa])
            && correspondeAoFiltro(
                filtrosTransacoes.corretora,
                transacao.corretora ? [getNomeCorretora(transacao.corretora)] : []
            )
            && correspondeAoFiltro(filtrosTransacoes.data, [
                toDateInputValue(transacao.dataHora),
                dataHora ? dataHora.toLocaleString('pt-BR') : ''
            ]);
    });
    const opcoesTickerPosicoes = opcoesUnicas(posicoes.map((acao) => acao.ticker));
    const opcoesEmpresaPosicoes = opcoesUnicas(posicoes.map((acao) => acao.nomeEmpresa));
    const opcoesCorretoraPosicoes = opcoesUnicas(posicoes.map((acao) => getNomeCorretora(acao.corretoraRelacionada)));
    const opcoesAtivoTransacoes = opcoesUnicas(transacoes
        .filter((transacao) => transacao.tipo !== 'APORTE')
        .map((transacao) => transacao.ticker));
    const opcoesCorretoraTransacoes = opcoesUnicas(transacoes
        .filter((transacao) => transacao.corretora)
        .map((transacao) => getNomeCorretora(transacao.corretora)));
    const opcoesDataTransacoes = [...new Map(
        transacoes
            .filter((transacao) => transacao.dataHora)
            .map((transacao) => {
                const data = new Date(transacao.dataHora);
                return [toDateInputValue(transacao.dataHora), data.toLocaleDateString('pt-BR')];
            })
    ).entries()].sort(([primeiraData], [segundaData]) => segundaData.localeCompare(primeiraData));

    return (
        <div className="container">
            <Navbar title="Minha Carteira" />

            <main className="page-content">
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

                <section className="form-panel">
                    <h3>Comprar Ação</h3>
                    <form onSubmit={comprarAcao} className="app-form">
                        <div className="field-group">
                            <label>Ativo</label>
                            <select
                                value={compra.acaoId}
                                onChange={(event) => setCompra({ ...compra, acaoId: event.target.value })}
                                className="form-input"
                                disabled={isLoading}
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
                            <label>Corretora</label>
                            <select
                                value={compra.corretoraId}
                                onChange={(event) => setCompra({ ...compra, corretoraId: event.target.value })}
                                className="form-input"
                                disabled={isLoading}
                            >
                                <option value="">Selecione uma corretora...</option>
                                {corretoras.map((corretora) => (
                                    <option key={corretora.id} value={corretora.id}>{getNomeCorretora(corretora)}</option>
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
                                disabled={isLoading}
                            />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={isLoading || !carteira}>Comprar</button>
                        </div>
                    </form>
                </section>

                {mensagem.texto && <p className={`alert ${mensagem.tipo === 'error' ? 'alert-error' : 'alert-success'}`}>{mensagem.texto}</p>}

                <section className="table-container">
                    <div className="table-heading">
                        <div>
                            <p className="eyebrow">Composição</p>
                            <h3>Minhas posições</h3>
                        </div>
                        <div className="table-heading-actions">
                            <button
                                type="button"
                                className="btn btn-secondary btn-small quote-refresh-button"
                                onClick={atualizarCotacoes}
                                disabled={atualizandoCotacoes || posicoes.length === 0}
                            >
                                <RefreshCw size={16} aria-hidden="true" className={atualizandoCotacoes ? 'is-spinning' : ''} />
                                <span>{atualizandoCotacoes ? 'Atualizando...' : 'Atualizar cotações'}</span>
                            </button>
                            <span className="table-count">{posicoesFiltradas.length} de {posicoes.length}</span>
                        </div>
                    </div>
                    {posicoes.length > 0 ? (
                        <>
                        <div className="table-filter-bar" role="group" aria-label="Filtros de posições">
                            <select value={filtrosPosicoes.ticker} onChange={(event) => atualizarFiltroPosicoes('ticker', event.target.value)} aria-label="Filtrar ticker" className="column-filter">
                                <option value="">Todos os tickers</option>
                                {opcoesTickerPosicoes.map((ticker) => <option key={ticker} value={ticker}>{ticker}</option>)}
                            </select>
                            <select value={filtrosPosicoes.empresa} onChange={(event) => atualizarFiltroPosicoes('empresa', event.target.value)} aria-label="Filtrar empresa" className="column-filter">
                                <option value="">Todas as empresas</option>
                                {opcoesEmpresaPosicoes.map((empresa) => <option key={empresa} value={empresa}>{empresa}</option>)}
                            </select>
                            <select value={filtrosPosicoes.corretora} onChange={(event) => atualizarFiltroPosicoes('corretora', event.target.value)} aria-label="Filtrar corretora" className="column-filter">
                                <option value="">Todas as corretoras</option>
                                {opcoesCorretoraPosicoes.map((corretora) => <option key={corretora} value={corretora}>{corretora}</option>)}
                            </select>
                            <select value={filtrosPosicoes.mercado} onChange={(event) => atualizarFiltroPosicoes('mercado', event.target.value)} aria-label="Filtrar mercado" className="column-filter">
                                <option value="">Todos os mercados</option>
                                <option value="BR">Brasil</option>
                                <option value="US">EUA</option>
                            </select>
                            <select value={filtrosPosicoes.resultado} onChange={(event) => atualizarFiltroPosicoes('resultado', event.target.value)} aria-label="Filtrar resultado" className="column-filter">
                                <option value="">Todos os resultados</option>
                                <option value="positivo">Lucro</option>
                                <option value="negativo">Prejuízo</option>
                                <option value="neutro">Neutro</option>
                            </select>
                        </div>
                        <table id="minhaTabela" className="positions-table">
                            <thead>
                            <tr>
                                <th>Ticker</th>
                                <th>Empresa</th>
                                <th>Corretora</th>
                                <th>Mercado</th>
                                <th className="table-number">Quantidade</th>
                                <th className="table-number">Preço médio</th>
                                <th className="table-number">Cotação</th>
                                <th className="table-number">Posição</th>
                                <th className="table-number">Resultado</th>
                                <th>Ação</th>
                            </tr>
                            </thead>
                            <tbody>
                            {posicoesFiltradas.map((acao) => (
                                <tr key={acao.posicaoId || acao.id}>
                                    <td><span className="ticker-badge">{acao.ticker}</span></td>
                                    <td>{acao.nomeEmpresa || '---'}</td>
                                    <td>{getNomeCorretora(acao.corretoraRelacionada)}</td>
                                    <td>{acao.mercado}</td>
                                    <td className="table-number">{acao.quantidadeTotal}</td>
                                    <td className="price table-number">{formatCurrency(acao.precoMedio, acao.moeda)}</td>
                                    <td className="price table-number">{formatCurrency(acao.cotacaoAtual, acao.moeda)}</td>
                                    <td className="price table-number">{formatCurrency(acao.posicao, acao.moeda)}</td>
                                    <td className={`table-number performance-cell ${performanceClass(acao.lucroPrejuizo)}`}>
                                        <strong>{formatCurrency(acao.lucroPrejuizo, acao.moeda)}</strong>
                                        <small>{formatPercentage(acao.rentabilidadePercentual)}</small>
                                    </td>
                                    <td><button type="button" className="btn btn-danger btn-table" onClick={() => abrirVenda(acao)}>Vender</button></td>
                                </tr>
                            ))}
                            {posicoesFiltradas.length === 0 && (
                                <tr><td colSpan="10" className="table-empty">Nenhuma posição encontrada.</td></tr>
                            )}
                            </tbody>
                        </table>
                        </>
                    ) : <div className="empty-state"><p>Nenhuma posição cadastrada na carteira.</p></div>}
                </section>

                <section className="table-container">
                    <div className="table-heading">
                        <div>
                            <p className="eyebrow">Operações</p>
                            <h3>Histórico de transações</h3>
                        </div>
                        <span className="table-count">{transacoesFiltradas.length} de {transacoes.length}</span>
                    </div>
                    {transacoes.length > 0 ? (
                        <>
                        <div className="table-filter-bar" role="group" aria-label="Filtros de transações">
                            <select value={filtrosTransacoes.tipo} onChange={(event) => atualizarFiltroTransacoes('tipo', event.target.value)} aria-label="Filtrar tipo de transação" className="column-filter">
                                <option value="">Todos os tipos</option>
                                <option value="APORTE">Aporte</option>
                                <option value="COMPRA">Compra</option>
                                <option value="VENDA">Venda</option>
                            </select>
                            <select value={filtrosTransacoes.ativo} onChange={(event) => atualizarFiltroTransacoes('ativo', event.target.value)} aria-label="Filtrar ativo" className="column-filter">
                                <option value="">Todos os ativos</option>
                                {opcoesAtivoTransacoes.map((ticker) => <option key={ticker} value={ticker}>{ticker}</option>)}
                            </select>
                            <select value={filtrosTransacoes.corretora} onChange={(event) => atualizarFiltroTransacoes('corretora', event.target.value)} aria-label="Filtrar corretora" className="column-filter">
                                <option value="">Todas as corretoras</option>
                                {opcoesCorretoraTransacoes.map((corretora) => <option key={corretora} value={corretora}>{corretora}</option>)}
                            </select>
                            <select value={filtrosTransacoes.data} onChange={(event) => atualizarFiltroTransacoes('data', event.target.value)} aria-label="Filtrar data" className="column-filter">
                                <option value="">Todas as datas</option>
                                {opcoesDataTransacoes.map(([data, rotulo]) => <option key={data} value={data}>{rotulo}</option>)}
                            </select>
                        </div>
                        <table id="historicoTransacoes" className="transactions-table">
                            <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Ativo</th>
                                <th>Corretora</th>
                                <th className="table-number">Quantidade</th>
                                <th className="table-number">Preço unitário</th>
                                <th className="table-number">Total</th>
                                <th>Data</th>
                            </tr>
                            </thead>
                            <tbody>
                            {transacoesFiltradas.map((transacao) => (
                                <tr key={transacao.id}>
                                    <td><span className={`transaction-badge transaction-${transacao.tipo.toLowerCase()}`}>{transacao.tipo}</span></td>
                                    <td>{transacao.tipo === 'APORTE'
                                        ? <span className="transaction-asset">Saldo em conta</span>
                                        : <span className="ticker-badge">{transacao.ticker}</span>}
                                    </td>
                                    <td>{transacao.corretora ? getNomeCorretora(transacao.corretora) : '---'}</td>
                                    <td className="table-number">{transacao.tipo === 'APORTE' ? '---' : transacao.quantidade}</td>
                                    <td className="table-number">{formatCurrency(transacao.precoUnitario, transacao.moeda)}</td>
                                    <td className="table-number">{formatCurrency(transacao.valorTotal, transacao.moeda)}</td>
                                    <td>{transacao.dataHora ? new Date(transacao.dataHora).toLocaleString('pt-BR') : '---'}</td>
                                </tr>
                            ))}
                            {transacoesFiltradas.length === 0 && (
                                <tr><td colSpan="7" className="table-empty">Nenhuma transação encontrada.</td></tr>
                            )}
                            </tbody>
                        </table>
                        </>
                    ) : <div className="empty-state"><p>Nenhuma transação registrada.</p></div>}
                </section>

                {vendaAberta && posicaoEmVenda && (
                    <div className="modal-overlay">
                        <div className="modal-panel">
                            <div className="modal-header">
                                <h3>Vender Ação</h3>
                                <button type="button" onClick={() => setVendaAberta(false)} className="modal-close" aria-label="Fechar venda">x</button>
                            </div>
                            <form onSubmit={venderAcao} className="modal-form">
                                <div className="field-group">
                                    <label>Posição</label>
                                    <input
                                        type="text"
                                        value={`${posicaoEmVenda.ticker} - ${getNomeCorretora(posicaoEmVenda.corretoraRelacionada)} (${posicaoEmVenda.quantidadeTotal} disponível)`}
                                        className="form-input"
                                        readOnly
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Quantidade</label>
                                    <input
                                        type="number"
                                        value={venda.quantidade}
                                        onChange={(event) => setVenda({ ...venda, quantidade: event.target.value })}
                                        min="0.01"
                                        max={posicaoEmVenda.quantidadeTotal}
                                        step="0.01"
                                        className="form-input"
                                    />
                                </div>
                                <div className="field-group">
                                    <label>Valor unitário</label>
                                    <input
                                        type="number"
                                        value={venda.valorUnitario}
                                        onChange={(event) => setVenda({ ...venda, valorUnitario: event.target.value })}
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
            </main>
        </div>
    );
};

export default Carteiras;
