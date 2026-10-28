package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.PapelUsuario;
import jakarta.validation.constraints.*;

public record UsuarioUpdateRequest(
        @NotBlank @Size(max = 100) String nome,
        @NotBlank @Email @Size(max = 100) String email,
        @NotNull PapelUsuario papel,
        @NotNull Boolean ativo
) { }
