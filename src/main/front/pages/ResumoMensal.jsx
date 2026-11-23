import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Banknote, CalendarDays, ChevronLeft, ChevronRight, ShoppingCart, TrendingUp } from 'lucide-react';
import Navbar from '../components/Navbar';
import PrivacyToggle, { VALOR_OCULTO } from '../components/PrivacyToggle';
import EvolucaoMensal from '../components/EvolucaoMensal';
import { apiFetch, getErrorMessage } from '../services/api';
import { construirResumoMensal } from '../services/resumoMensal';

const mesAtual = () => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
};
const TIPOS = { APORTE: 'Aporte', COMPRA: 'Compra', VENDA: 'Venda', TRANSFERENCIA_ENTRADA: 'Transferência recebida', TRANSFERENCIA_SAIDA: 'Transferência enviada' };

export default function ResumoMensal({ modoPrivacidade = false, aoAlternarPrivacidade }) {
    const [mes, setMes] = useState(mesAtual);
    const [dados, setDados] = useState(null);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [moeda, setMoeda] = useState('BRL');
    const [tentativa, setTentativa] = useState(0);

    useEffect(() => {
        let ativo = true;
        const carregar = async () => {
            setCarregando(true);
            setDados(null);
            setErro('');
            try {
                const respostas = await Promise.all([
                    apiFetch('/carteiras/principal'), apiFetch('/carteiras/principal/transacoes'),
                    apiFetch('/carteiras/principal/posicoes')
                ]);
                const falha = respostas.find((resposta) => !resposta.ok);
                if (falha) throw new Error(await getErrorMessage(falha, 'Não foi possível carregar o resumo mensal.'));
                const [carteira, transacoes, posicoes] = await Promise.all(respostas.map((resposta) => resposta.json()));
                if (ativo) setDados({ carteira, transacoes, posicoes });
            } catch (error) {
                if (ativo) setErro(error.message);
            } finally {
                if (ativo) setCarregando(false);
            }
        };
        carregar();
        return () => { ativo = false; };
    }, [tentativa]);

    const mesValido = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && mes >= '0001-01' && mes <= mesAtual();
    const mudarMes = (delta) => {
        const data = new Date(`${mes}-01T12:00:00`);
        data.setMonth(data.getMonth() + delta);
        setMes(`${String(data.getFullYear()).padStart(4, '0')}-${String(data.getMonth() + 1).padStart(2, '0')}`);
    };
    const resumo = dados && mesValido && construirResumoMensal(dados.carteira, dados.transacoes, mes, moeda, dados.posicoes);
    const dinheiro = (valor, comSinal = false) => modoPrivacidade ? VALOR_OCULTO
        : valor === null ? 'Indisponível'
            : `${comSinal && valor > 0 ? '+ ' : ''}${valor.toLocaleString('pt-BR', { style: 'currency', currency: moeda })}`;
    const indicadores = resumo && [
        { titulo: 'Aportes do mês', valor: resumo.aportes, legenda: 'Entradas de dinheiro', Icon: ArrowDownToLine },
        { titulo: 'Compras', valor: resumo.compras, legenda: 'Investido em ações', Icon: ShoppingCart },
        { titulo: 'Vendas', valor: resumo.vendas, legenda: 'Valor recebido', Icon: Banknote },
        { titulo: 'Resultado do período', valor: resumo.resultado, legenda: 'Sem considerar aportes', Icon: TrendingUp, resultado: true }
    ];

    return <div className="container">
        <Navbar title="Resumo mensal" titleAction={aoAlternarPrivacidade && (
            <PrivacyToggle ativo={modoPrivacidade} aoAlternar={aoAlternarPrivacidade} />
        )} />
        <main className="page-content monthly-page">
            <p className="monthly-intro">Suas movimentações e a evolução da carteira em um só lugar.</p>
            <div className="monthly-controls">
                <div className="monthly-period">
                    <button type="button" className="btn btn-secondary" aria-label="Mês anterior"
                        disabled={!mesValido || mes === '0001-01'} onClick={() => mudarMes(-1)}><ChevronLeft size={18} aria-hidden="true" /></button>
                    <div className="monthly-period-input">
                        <CalendarDays size={19} aria-hidden="true" />
                        <label className="sr-only" htmlFor="mes-resumo">Mês do resumo</label>
                        <input id="mes-resumo" type="month" value={mes} min="0001-01" max={mesAtual()} className="form-input"
                            onChange={(event) => setMes(event.target.value)} />
                    </div>
                    <button type="button" className="btn btn-secondary" aria-label="Próximo mês"
                        disabled={!mesValido || mes >= mesAtual()} onClick={() => mudarMes(1)}><ChevronRight size={18} aria-hidden="true" /></button>
                </div>
                <div className="portfolio-periods monthly-currency" role="group" aria-label="Moeda do resumo">
                    {['BRL', 'USD'].map((item) => <button key={item} type="button" className="btn btn-secondary"
                        aria-pressed={moeda === item} onClick={() => setMoeda(item)}>{item}</button>)}
                </div>
            </div>
            {!mesValido && <p role="alert" className="alert alert-error">Selecione um mês válido até o mês atual.</p>}
            {carregando && <p role="status">Carregando resumo mensal...</p>}
            {erro && <div className="monthly-error">
                <p role="alert" className="alert alert-error">{erro}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button>
            </div>}
            {resumo && <>
                {!resumo.historicoCompleto && <p role="alert" className="alert alert-info">
                    O histórico disponível não permite reconstruir o patrimônio deste período. Os totais de movimentações e o saldo em caixa continuam disponíveis.
                </p>}
                <section className="dashboard-cards monthly-indicators" aria-label="Indicadores do mês">
                    {indicadores.map(({ titulo, valor, legenda, Icon, resultado }) => <article key={titulo}
                        className={`card${resultado ? ' card-featured' : ''}`}>
                        <div className="monthly-card-label"><Icon size={20} aria-hidden="true" /><span>{titulo}</span></div>
                        <strong className={`stat stat-money${resultado && valor < 0 && !modoPrivacidade ? ' performance-negative' : ''}`}>{dinheiro(valor, resultado)}</strong>
                        <p>{legenda}</p>
                    </article>)}
                </section>
                <div className="monthly-overview-grid">
                <EvolucaoMensal resumo={resumo} moeda={moeda} modoPrivacidade={modoPrivacidade} />
                <section className="form-panel monthly-closing" aria-labelledby="monthly-closing-title">
                    <h2 id="monthly-closing-title">Fechamento do mês</h2>
                    <dl>
                        <div><dt>Patrimônio inicial</dt><dd>{dinheiro(resumo.patrimonioInicial)}</dd></div>
                        <div><dt>Aportes</dt><dd>{dinheiro(resumo.aportes, true)}</dd></div>
                        <div><dt>Resultado do período</dt><dd>{dinheiro(resumo.resultado, true)}</dd></div>
                        <div className="monthly-closing-total"><dt>Patrimônio final</dt><dd>{dinheiro(resumo.patrimonioFinal)}</dd></div>
                        <div><dt>Saldo em caixa</dt><dd>{dinheiro(resumo.saldoFinal)}</dd></div>
                    </dl>
                </section>
                </div>
                <p className="portfolio-chart-note monthly-note">Histórico pelo custo das posições e saldo em caixa. O resultado usa o custo médio, sem considerar aportes ou valorização não realizada.</p>
                <section className="table-container">
                    <div className="table-heading"><h2 id="monthly-transactions-title">Movimentações do mês</h2></div>
                    <table aria-labelledby="monthly-transactions-title">
                        <thead><tr><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Ativo</th><th scope="col" className="table-number">Valor</th></tr></thead>
                        <tbody>{resumo.transacoes.length ? resumo.transacoes.map((item) => <tr key={item.id}>
                            <td>{new Date(item.dataHora).toLocaleDateString('pt-BR')}</td>
                            <td><span className="badge">{TIPOS[item.tipo]}</span></td>
                            <td>{item.tipo === 'APORTE' ? '—' : `${item.ticker}${item.nomeEmpresa ? ` · ${item.nomeEmpresa}` : ''}`}</td>
                            <td className="table-number">{dinheiro(item.tipo === 'COMPRA' ? -Number(item.valorTotal) : Number(item.valorTotal), item.tipo === 'APORTE' || item.tipo === 'VENDA')}</td>
                        </tr>) : <tr><td colSpan="4" className="empty-state">Nenhuma movimentação neste mês e nesta moeda.</td></tr>}</tbody>
                    </table>
                </section>
                <p className="portfolio-chart-note">Moedas exibidas separadamente.</p>
            </>}
        </main>
    </div>;
}
