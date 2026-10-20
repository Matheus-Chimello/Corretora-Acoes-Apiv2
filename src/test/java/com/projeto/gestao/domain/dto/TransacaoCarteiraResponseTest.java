package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.model.TipoTransacao;
import com.projeto.gestao.domain.model.TransacaoCarteira;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TransacaoCarteiraResponseTest {
    @Test
    void representaAporteSemAcaoOuCorretora() {
        TransacaoCarteira transacao = new TransacaoCarteira();
        transacao.setTipo(TipoTransacao.APORTE);
        var resposta = TransacaoCarteiraResponse.from(transacao);
        assertEquals("APORTE", resposta.ticker());
        assertEquals("Saldo em conta", resposta.nomeEmpresa());
        assertEquals("BRL", resposta.moeda());
        assertNull(resposta.corretora());
    }

    @Test
    void representaCompraEmMoedaAmericanaEComCorretora() {
        Acao acao = new Acao(); acao.setTicker("IBM"); acao.setNomeEmpresa("IBM"); acao.setMoeda("usd");
        Corretora corretora = new Corretora(); corretora.setRazaoSocial("Corretora A");
        TransacaoCarteira transacao = new TransacaoCarteira();
        transacao.setTipo(TipoTransacao.COMPRA); transacao.setAcao(acao); transacao.setCorretora(corretora);
        var resposta = TransacaoCarteiraResponse.from(transacao);
        assertEquals("IBM", resposta.ticker());
        assertEquals("USD", resposta.moeda());
        assertNotNull(resposta.corretora());
        assertEquals("Corretora A", resposta.corretora().razaoSocial());
    }

    @Test
    void representaVendaBrasileiraSemDadosDaCorretora() {
        Acao acao = new Acao(); acao.setTicker("PETR4"); acao.setMoeda("BRL");
        TransacaoCarteira transacao = new TransacaoCarteira();
        transacao.setTipo(TipoTransacao.VENDA); transacao.setAcao(acao);
        var resposta = TransacaoCarteiraResponse.from(transacao);
        assertEquals("PETR4", resposta.ticker());
        assertEquals("BRL", resposta.moeda());
        assertNull(resposta.corretora());
    }
}
