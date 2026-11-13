package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.RegistroAdministrativo;

import java.time.Instant;

public record RegistroAdministrativoResponse(
        Long id, Instant dataHora, String autor, RegistroAdministrativo.Acao acao, String alvo, String resultado
) {
    public static RegistroAdministrativoResponse from(RegistroAdministrativo registro) {
        return new RegistroAdministrativoResponse(registro.getId(), registro.getDataHora(), registro.getAutor(),
                registro.getAcao(), registro.getAlvo(), registro.getResultado());
    }
}
