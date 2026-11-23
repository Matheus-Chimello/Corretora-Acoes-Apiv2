import React from 'react';
import { VALOR_OCULTO } from './PrivacyToggle';

export default function SimulacaoCompra({ simulacao, modoPrivacidade, children }) {
    const dinheiro = (valor) => modoPrivacidade ? VALOR_OCULTO : valor.toLocaleString('pt-BR', {
        style: 'currency', currency: simulacao.moeda
    });
    const quantidade = (valor) => modoPrivacidade ? VALOR_OCULTO : `${valor.toLocaleString('pt-BR')} ações`;
    return (
        <section className="form-panel purchase-simulation" aria-labelledby="purchase-simulation-title">
            <div className="purchase-simulation-heading">
                <h3 id="purchase-simulation-title">Simulação da compra</h3>
                <span className="badge">Prévia</span>
            </div>
            <p className="purchase-hint">Veja como sua posição vai ficar.</p>
            <div aria-live="polite" aria-atomic="true">
                {simulacao ? <>
                    <p className="purchase-hint">Valor da compra</p>
                    <strong className="purchase-total">{dinheiro(simulacao.total)}</strong>
                    <table className="purchase-comparison">
                        <thead><tr><th scope="col"><span className="sr-only">Indicador</span></th><th scope="col">Antes</th><th scope="col">Após a compra</th></tr></thead>
                        <tbody>
                            <tr><th scope="row">{simulacao.moeda === 'USD' ? 'Saldo em dólares' : 'Saldo em reais'}</th><td>{dinheiro(simulacao.saldoAnterior)}</td><td>{dinheiro(simulacao.saldoDepois)}</td></tr>
                            <tr><th scope="row">Quantidade</th><td>{quantidade(simulacao.quantidadeAnterior)}</td><td>{quantidade(simulacao.quantidadeDepois)}</td></tr>
                            <tr><th scope="row">Preço médio</th><td>{dinheiro(simulacao.precoMedioAnterior)}</td><td>{dinheiro(simulacao.precoMedioDepois)}</td></tr>
                        </tbody>
                    </table>
                    {!simulacao.saldoSuficiente && <p role="alert" className="alert alert-error">
                        Saldo em {simulacao.moeda} insuficiente para esta compra.
                    </p>}
                </> : <p className="purchase-empty">Selecione o ativo e a corretora e informe quantidade e preço válidos para simular.</p>}
            </div>
            <div className="purchase-confirm">{children}</div>
        </section>
    );
}
