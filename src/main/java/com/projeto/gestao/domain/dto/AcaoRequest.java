package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record AcaoRequest(
        @NotBlank(message = "Ticker e obrigatorio.") String ticker,
        @NotBlank(message = "Mercado e obrigatorio.") String mercado
) {
}
