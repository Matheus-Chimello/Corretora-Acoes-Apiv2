package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record CompraAcaoRequest(
        @NotNull(message = "Corretora e obrigatoria.") UUID corretoraId,
        @NotNull(message = "Quantidade e obrigatoria.") @Positive(message = "Quantidade deve ser maior que zero.") BigDecimal quantidade,
        @Positive(message = "Valor unitario deve ser maior que zero.") BigDecimal valorUnitario
) {
}
