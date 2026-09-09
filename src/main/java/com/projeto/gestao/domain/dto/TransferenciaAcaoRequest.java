package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record TransferenciaAcaoRequest(
        @NotNull(message = "Corretora de destino e obrigatoria.") UUID corretoraDestinoId,
        @NotNull(message = "Quantidade e obrigatoria.") @Positive(message = "Quantidade deve ser maior que zero.") BigDecimal quantidade
) {
}
