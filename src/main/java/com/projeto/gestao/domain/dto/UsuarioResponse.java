package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import java.util.UUID;

public record UsuarioResponse(UUID id, String nome, String email, PapelUsuario papel, Boolean ativo) {
    public static UsuarioResponse from(Usuario usuario) {
        return new UsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(),
                usuario.getPapel(), usuario.getAtivo());
    }
}
