package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record QuantidadeRequest(
        @NotNull(message = "Quantidade e obrigatoria.") @Positive(message = "Quantidade deve ser maior que zero.") BigDecimal quantidade
) {
}
