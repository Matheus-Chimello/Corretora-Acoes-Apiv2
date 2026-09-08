package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.TransacaoCarteira;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record TransacaoCarteiraResponse(
        UUID id,
        String tipo,
        String ticker,
        String nomeEmpresa,
        BigDecimal quantidade,
        BigDecimal precoUnitario,
        BigDecimal valorTotal,
        LocalDateTime dataHora,
        String moeda,
        AcaoResponse.CorretoraResumo corretora
) {
    public static TransacaoCarteiraResponse from(TransacaoCarteira transacao) {
        boolean aporte = transacao.getTipo().name().equals("APORTE");
        return new TransacaoCarteiraResponse(
                transacao.getId(),
                transacao.getTipo().name(),
                aporte ? "APORTE" : transacao.getAcao().getTicker(),
                aporte ? "Saldo em conta" : transacao.getAcao().getNomeEmpresa(),
                transacao.getQuantidade(),
                transacao.getPrecoUnitario(),
                transacao.getValorTotal(),
                transacao.getDataHora(),
                aporte || !"USD".equalsIgnoreCase(transacao.getAcao().getMoeda()) ? "BRL" : "USD",
                aporte ? null : AcaoResponse.corretoraResumo(transacao.getCorretora())
        );
    }
}
