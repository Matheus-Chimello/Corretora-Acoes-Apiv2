package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.PosicaoCarteira;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PosicaoAcaoResponseTest {

    @Test
    void deveCalcularLucroPrejuizoERentabilidadeDaPosicao() {
        Acao acao = new Acao();
        acao.setTicker("PETR4");
        acao.setMercado("BR");
        acao.setMoeda("BRL");
        acao.setCotacaoAtual(new BigDecimal("12.50"));

        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setAcao(acao);
        posicao.setQuantidadeTotal(new BigDecimal("4"));
        posicao.setPrecoMedio(new BigDecimal("10.00"));

        PosicaoAcaoResponse resposta = PosicaoAcaoResponse.from(posicao);

        assertEquals(0, new BigDecimal("50.00").compareTo(resposta.posicao()));
        assertEquals(0, new BigDecimal("40.00").compareTo(resposta.valorInvestido()));
        assertEquals(0, new BigDecimal("10.00").compareTo(resposta.lucroPrejuizo()));
        assertEquals(0, new BigDecimal("25.00").compareTo(resposta.rentabilidadePercentual()));
    }

    @Test
    void deveTratarDadosAusentesESemValorInvestidoComoZero() {
        Acao acao = new Acao();
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setAcao(acao);
        posicao.setQuantidadeTotal(null);
        posicao.setPrecoMedio(null);
        PosicaoAcaoResponse resposta = PosicaoAcaoResponse.from(posicao);
        assertEquals(0, BigDecimal.ZERO.compareTo(resposta.posicao()));
        assertEquals(0, BigDecimal.ZERO.compareTo(resposta.valorInvestido()));
        assertEquals(0, BigDecimal.ZERO.compareTo(resposta.rentabilidadePercentual()));
    }
}
