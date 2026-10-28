package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.PapelUsuario;
import jakarta.validation.constraints.*;

public record UsuarioCreateRequest(
        @NotBlank @Size(max = 100) String nome,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotNull PapelUsuario papel
) { }
