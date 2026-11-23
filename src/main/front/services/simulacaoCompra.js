export function simularCompra({ acao, corretoraId, quantidade, valorUnitario, carteira, posicoes }) {
    const quantidadeCompra = Number(quantidade);
    const preco = Number(valorUnitario || acao?.cotacaoAtual);
    if (!acao || !corretoraId || !carteira || !Number.isFinite(quantidadeCompra) || quantidadeCompra <= 0
        || !Number.isFinite(preco) || preco <= 0
        || preco !== Math.round(preco * 100) / 100 || quantidadeCompra !== Math.round(quantidadeCompra * 100) / 100
        || (acao.mercado === 'BR' && !Number.isInteger(quantidadeCompra))) return null;

    const posicao = posicoes.find((item) => item.id === acao.id && item.corretoraRelacionada?.id === corretoraId);
    const quantidadeAnterior = Number(posicao?.quantidadeTotal || 0);
    const precoMedioAnterior = Number(posicao?.precoMedio || 0);
    const quantidadeDepois = quantidadeAnterior + quantidadeCompra;
    const moeda = acao.moeda === 'USD' ? 'USD' : 'BRL';
    const saldoCentavos = Math.round(Number((moeda === 'USD' ? carteira.saldoEmDolar : carteira.saldoEmConta) || 0) * 100);
    const quantidadeUnidades = Math.round(quantidadeCompra * 100);
    const quantidadeAnteriorUnidades = Math.round(quantidadeAnterior * 100);
    const custo = quantidadeUnidades * Math.round(preco * 100);
    return {
        moeda, total: custo / 10000, quantidadeAnterior, precoMedioAnterior,
        valorUnitario: preco,
        saldoAnterior: saldoCentavos / 100,
        saldoSuficiente: saldoCentavos * 100 >= custo,
        saldoDepois: Math.round((saldoCentavos * 100 - custo) / 100) / 100,
        quantidadeDepois,
        precoMedioDepois: Math.round((quantidadeAnteriorUnidades * Math.round(precoMedioAnterior * 100) + custo)
            / (quantidadeAnteriorUnidades + quantidadeUnidades)) / 100
    };
}
