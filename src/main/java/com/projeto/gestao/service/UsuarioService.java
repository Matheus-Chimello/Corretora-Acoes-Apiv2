package com.projeto.gestao.service;

import com.projeto.gestao.domain.dto.UsuarioCreateRequest;
import com.projeto.gestao.domain.dto.UsuarioResponse;
import com.projeto.gestao.domain.dto.UsuarioUpdateRequest;
import com.projeto.gestao.domain.dto.AlterarSenhaRequest;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;
import java.util.UUID;
import java.util.List;

@Service
public class UsuarioService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> findAll() {
        return usuarios.findAll().stream().map(UsuarioResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse findById(UUID id) { return UsuarioResponse.from(findEntity(id)); }

    @Transactional
    public UsuarioResponse create(UsuarioCreateRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        validarEmailDisponivel(email, null);
        var usuario = new Usuario();
        usuario.setNome(request.nome().trim());
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(request.password()));
        usuario.setPapel(request.papel());
        usuario.setAtivo(true);
        return UsuarioResponse.from(usuarios.save(usuario));
    }

    @Transactional
    public UsuarioResponse update(UUID id, UsuarioUpdateRequest request) {
        var usuario = findEntity(id);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        validarEmailDisponivel(email, id);
        usuario.setNome(request.nome().trim());
        usuario.setEmail(email);
        usuario.setPapel(request.papel());
        usuario.setAtivo(request.ativo());
        return UsuarioResponse.from(usuarios.save(usuario));
    }

    @Transactional
    public void alterarSenha(UUID id, AlterarSenhaRequest request) {
        var usuario = findEntity(id);
        usuario.setSenhaHash(passwordEncoder.encode(request.password()));
        usuarios.save(usuario);
    }

    private Usuario findEntity(UUID id) {
        return usuarios.findById(id).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Usuario nao encontrado."));
    }

    private void validarEmailDisponivel(String email, UUID id) {
        usuarios.findByEmailIgnoreCase(email).ifPresent(existente -> {
            if (!existente.getId().equals(id)) {
                throw new DataIntegrityViolationException("Ja existe um usuario com este email.");
            }
        });
    }
}
