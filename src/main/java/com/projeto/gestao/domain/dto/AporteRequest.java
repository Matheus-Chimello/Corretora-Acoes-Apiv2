package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Moeda;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record AporteRequest(
        @NotNull(message = "Valor do aporte e obrigatorio.") @Positive(message = "Valor do aporte deve ser maior que zero.") BigDecimal valor,
        @Pattern(regexp = "BRL|USD", message = "Informe BRL ou USD.") String moeda
) {
    public Moeda moedaDoAporte() {
        return moeda == null ? Moeda.BRL : Moeda.valueOf(moeda);
    }
}
