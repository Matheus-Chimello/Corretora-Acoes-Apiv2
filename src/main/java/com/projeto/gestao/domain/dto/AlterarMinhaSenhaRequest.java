package com.projeto.gestao.domain.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarMinhaSenhaRequest(
        @NotBlank(message = "Informe a senha atual.")
        @Size(max = 72, message = "A senha atual deve ter até 72 caracteres.") String senhaAtual,
        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 72, message = "A nova senha deve ter entre 8 e 72 caracteres.") String novaSenha
) { }
