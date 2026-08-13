package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AporteRequest(
        @NotNull(message = "Valor do aporte e obrigatorio.") @Positive(message = "Valor do aporte deve ser maior que zero.") BigDecimal valor
) {
}
