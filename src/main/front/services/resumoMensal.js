const centavos = (valor) => Math.round(Number(valor || 0) * 100);
const moedaDaTransacao = (transacao) => transacao.moeda === 'USD' ? 'USD' : 'BRL';
const chavePosicao = (transacao) => `${transacao.ticker}:${transacao.corretora?.id || ''}`;

function movimentoEmCaixa(transacao) {
    if (transacao.tipo === 'COMPRA') return -centavos(transacao.valorTotal);
    if (transacao.tipo === 'APORTE' || transacao.tipo === 'VENDA') return centavos(transacao.valorTotal);
    return 0;
}

function aplicarMovimento(estado, transacao) {
    estado.saldo += movimentoEmCaixa(transacao);
    if (transacao.tipo === 'APORTE') return;
    const chave = chavePosicao(transacao);
    const lote = estado.lotes.get(chave) || { quantidade: 0, precoMedio: 0 };
    const quantidade = Number(transacao.quantidade);
    if (transacao.tipo === 'COMPRA' || transacao.tipo === 'TRANSFERENCIA_ENTRADA') {
        const novaQuantidade = lote.quantidade + quantidade;
        const preco = centavos(transacao.precoUnitario ?? Number(transacao.valorTotal) / quantidade);
        lote.precoMedio = Math.round((lote.precoMedio * lote.quantidade + preco * quantidade) / novaQuantidade);
        lote.quantidade = novaQuantidade;
    } else {
        if (quantidade > lote.quantidade + 0.000001) estado.historicoCompleto = false;
        lote.quantidade = Math.max(0, lote.quantidade - quantidade);
    }
    estado.lotes.set(chave, lote);
}

const patrimonio = (estado) => estado.saldo + [...estado.lotes.values()]
    .reduce((total, lote) => total + Math.round(lote.quantidade * lote.precoMedio), 0);

// A aplicação conserva movimentações, não séries históricas de cotações.
// O fechamento usa o custo médio, sem aplicar preços atuais a meses passados.
export function construirResumoMensal(carteira, transacoes, mes, moeda = 'BRL', posicoes = []) {
    const registros = transacoes.filter((item) => moedaDaTransacao(item) === moeda)
        .sort((a, b) => a.dataHora.localeCompare(b.dataHora));
    const saldoAtual = centavos(moeda === 'USD' ? carteira.saldoEmDolar : carteira.saldoEmConta);
    const estado = {
        saldo: saldoAtual - registros.reduce((total, item) => total + movimentoEmCaixa(item), 0),
        lotes: new Map(), historicoCompleto: true
    };
    registros.filter((item) => item.dataHora.slice(0, 7) < mes).forEach((item) => aplicarMovimento(estado, item));
    const patrimonioInicial = patrimonio(estado);
    const doMes = registros.filter((item) => item.dataHora.slice(0, 7) === mes);
    const evolucao = [{ data: `${mes}-01`, label: 'Início', patrimonio: patrimonioInicial / 100, aportes: 0 }];
    const porDia = new Map();
    doMes.forEach((item) => {
        aplicarMovimento(estado, item);
        const data = item.dataHora.slice(0, 10);
        porDia.set(data, {
            data, label: `${data.slice(8, 10)}/${data.slice(5, 7)}`,
            patrimonio: patrimonio(estado) / 100,
            aportes: (porDia.get(data)?.aportes || 0) + (item.tipo === 'APORTE' ? centavos(item.valorTotal) / 100 : 0)
        });
    });
    evolucao.push(...porDia.values());
    const hoje = new Date();
    const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const fimDoMes = new Date(`${mes}-01T12:00:00`);
    fimDoMes.setMonth(fimDoMes.getMonth() + 1);
    fimDoMes.setDate(0);
    const diaFinal = mes === mesHoje ? hoje.getDate() : fimDoMes.getDate();
    const dataFinal = `${mes}-${String(diaFinal).padStart(2, '0')}`;
    if (evolucao.at(-1).data !== dataFinal || evolucao.length === 1) {
        evolucao.push({ data: dataFinal, label: mes === mesHoje ? 'Hoje' : `${diaFinal}/${mes.slice(5, 7)}`, patrimonio: patrimonio(estado) / 100, aportes: 0 });
    }
    const patrimonioFinal = patrimonio(estado);
    const saldoFinal = estado.saldo;
    registros.filter((item) => item.dataHora.slice(0, 7) > mes).forEach((item) => aplicarMovimento(estado, item));
    const posicoesAtuais = new Map(posicoes.filter((item) => moedaDaTransacao(item) === moeda)
        .map((item) => [`${item.ticker}:${item.corretoraRelacionada?.id || ''}`, Number(item.quantidadeTotal)]));
    const chaves = new Set([...estado.lotes.keys(), ...posicoesAtuais.keys()]);
    const historicoCompleto = estado.historicoCompleto && [...chaves].every((chave) => (
        Math.abs((estado.lotes.get(chave)?.quantidade || 0) - (posicoesAtuais.get(chave) || 0)) < 0.000001
    ));
    const totalDoTipo = (tipo) => doMes.filter((item) => item.tipo === tipo)
        .reduce((total, item) => total + centavos(item.valorTotal), 0);
    const aportes = totalDoTipo('APORTE');
    return {
        aportes: aportes / 100,
        compras: totalDoTipo('COMPRA') / 100,
        vendas: totalDoTipo('VENDA') / 100,
        resultado: historicoCompleto ? (patrimonioFinal - patrimonioInicial - aportes) / 100 : null,
        patrimonioInicial: historicoCompleto ? patrimonioInicial / 100 : null,
        patrimonioFinal: historicoCompleto ? patrimonioFinal / 100 : null,
        saldoFinal: saldoFinal / 100,
        historicoCompleto,
        evolucao: historicoCompleto ? evolucao : [],
        transacoes: [...doMes].reverse()
    };
}
