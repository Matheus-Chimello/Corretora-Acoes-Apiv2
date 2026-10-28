package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarSenhaRequest(@NotBlank @Size(min = 8, max = 72) String password) { }
