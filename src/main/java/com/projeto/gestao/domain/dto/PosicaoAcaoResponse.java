package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.PosicaoCarteira;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PosicaoAcaoResponse(
        UUID id,
        UUID posicaoId,
        String ticker,
        String nomeEmpresa,
        String mercado,
        String moeda,
        BigDecimal quantidadeTotal,
        BigDecimal cotacaoAtual,
        BigDecimal precoMedio,
        BigDecimal posicao,
        LocalDateTime dataHoraCotacao,
        AcaoResponse.CorretoraResumo corretoraRelacionada
) {
    public static PosicaoAcaoResponse from(PosicaoCarteira posicao) {
        Acao acao = posicao.getAcao();
        BigDecimal cotacao = acao.getCotacaoAtual() == null ? BigDecimal.ZERO : acao.getCotacaoAtual();
        return new PosicaoAcaoResponse(
                acao.getId(),
                posicao.getId(),
                acao.getTicker(),
                acao.getNomeEmpresa(),
                acao.getMercado(),
                acao.getMoeda(),
                posicao.getQuantidadeTotal(),
                cotacao,
                posicao.getPrecoMedio(),
                posicao.getQuantidadeTotal().multiply(cotacao),
                acao.getDataHoraCotacao(),
                AcaoResponse.corretoraResumo(acao.getCorretoraRelacionada())
        );
    }
}
