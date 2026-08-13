package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Corretora;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record AcaoResponse(
        UUID id,
        String ticker,
        String nomeEmpresa,
        String mercado,
        String moeda,
        BigDecimal cotacaoAtual,
        LocalDateTime dataHoraCotacao,
        CorretoraResumo corretoraRelacionada
) {
    public static AcaoResponse from(Acao acao) {
        Corretora corretora = acao.getCorretoraRelacionada();
        CorretoraResumo resumo = corretora == null ? null : new CorretoraResumo(
                corretora.getId(), corretora.getRazaoSocial(), corretora.getNomeFantasia(), corretora.getCnpj()
        );
        return new AcaoResponse(
                acao.getId(), acao.getTicker(), acao.getNomeEmpresa(), acao.getMercado(), acao.getMoeda(),
                acao.getCotacaoAtual(), acao.getDataHoraCotacao(), resumo
        );
    }

    public static CorretoraResumo corretoraResumo(Corretora corretora) {
        return corretora == null ? null : new CorretoraResumo(
                corretora.getId(), corretora.getRazaoSocial(), corretora.getNomeFantasia(), corretora.getCnpj()
        );
    }

    public record CorretoraResumo(UUID id, String razaoSocial, String nomeFantasia, String cnpj) {
    }
}
