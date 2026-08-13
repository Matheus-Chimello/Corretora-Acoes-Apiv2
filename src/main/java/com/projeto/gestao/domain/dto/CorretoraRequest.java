package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotBlank;

public record CorretoraRequest(
        @NotBlank(message = "CNPJ e obrigatorio.") String cnpj
) {
}
