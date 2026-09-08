package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.PosicaoCarteira;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
        BigDecimal valorInvestido,
        BigDecimal lucroPrejuizo,
        BigDecimal rentabilidadePercentual,
        LocalDateTime dataHoraCotacao,
        AcaoResponse.CorretoraResumo corretoraRelacionada
) {
    public static PosicaoAcaoResponse from(PosicaoCarteira posicao) {
        Acao acao = posicao.getAcao();
        BigDecimal cotacao = acao.getCotacaoAtual() == null ? BigDecimal.ZERO : acao.getCotacaoAtual();
        BigDecimal quantidade = posicao.getQuantidadeTotal() == null ? BigDecimal.ZERO : posicao.getQuantidadeTotal();
        BigDecimal precoMedio = posicao.getPrecoMedio() == null ? BigDecimal.ZERO : posicao.getPrecoMedio();
        BigDecimal valorAtual = quantidade.multiply(cotacao);
        BigDecimal valorInvestido = quantidade.multiply(precoMedio);
        BigDecimal lucroPrejuizo = valorAtual.subtract(valorInvestido);
        BigDecimal rentabilidadePercentual = valorInvestido.signum() == 0
                ? BigDecimal.ZERO
                : lucroPrejuizo.multiply(BigDecimal.valueOf(100)).divide(valorInvestido, 2, RoundingMode.HALF_UP);
        return new PosicaoAcaoResponse(
                acao.getId(),
                posicao.getId(),
                acao.getTicker(),
                acao.getNomeEmpresa(),
                acao.getMercado(),
                acao.getMoeda(),
                quantidade,
                cotacao,
                precoMedio,
                valorAtual,
                valorInvestido,
                lucroPrejuizo,
                rentabilidadePercentual,
                acao.getDataHoraCotacao(),
                AcaoResponse.corretoraResumo(posicao.getCorretora())
        );
    }
}
