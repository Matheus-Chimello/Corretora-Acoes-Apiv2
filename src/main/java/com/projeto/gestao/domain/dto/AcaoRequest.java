package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AcaoRequest(
        @NotBlank(message = "Ticker e obrigatorio.") String ticker,
        @NotBlank(message = "Mercado e obrigatorio.") String mercado,
        @NotNull(message = "Corretora e obrigatoria.") UUID corretoraId
) {
}
