package com.projeto.gestao.service;

import com.projeto.gestao.domain.dto.UsuarioCreateRequest;
import com.projeto.gestao.domain.dto.UsuarioResponse;
import com.projeto.gestao.domain.dto.UsuarioUpdateRequest;
import com.projeto.gestao.domain.dto.AlterarSenhaRequest;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.List;

import static com.projeto.gestao.domain.model.RegistroAdministrativo.Acao.ALTERACAO_PERFIL;
import static com.projeto.gestao.domain.model.RegistroAdministrativo.Acao.INATIVACAO_CONTA;

@Service
public class UsuarioService {
    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final HistoricoAdministrativoService historico;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder passwordEncoder, HistoricoAdministrativoService historico) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.historico = historico;
    }

    @Transactional(readOnly = true)
    public List<UsuarioResponse> findAll() {
        return usuarios.findAll().stream().map(UsuarioResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UsuarioResponse findById(UUID id) { return UsuarioResponse.from(exigirUsuario(usuarios.findById(id))); }

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
    public UsuarioResponse update(String autor, UUID id, UsuarioUpdateRequest request) {
        boolean podeRemoverAcesso = request.papel() != PapelUsuario.ADMIN || !request.ativo();
        // Bloqueia os administradores em ordem para serializar remoções concorrentes.
        List<Usuario> administradoresAtivos = podeRemoverAcesso
                ? usuarios.findAtivosPorPapelParaAtualizar(PapelUsuario.ADMIN) : List.of();
        var usuario = exigirUsuario(usuarios.findByIdParaAtualizar(id));
        if (podeRemoverAcesso && usuario.getPapel() == PapelUsuario.ADMIN && usuario.getAtivo()
                && administradoresAtivos.stream().noneMatch(admin -> !admin.getId().equals(id))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Mantenha pelo menos um administrador ativo.");
        }
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        validarEmailDisponivel(email, id);
        var papelAnterior = usuario.getPapel();
        boolean estavaAtivo = usuario.getAtivo();
        usuario.setNome(request.nome().trim());
        usuario.setEmail(email);
        usuario.setPapel(request.papel());
        usuario.setAtivo(request.ativo());
        var salvo = usuarios.save(usuario);
        if (papelAnterior != salvo.getPapel()) {
            historico.registrar(autor, ALTERACAO_PERFIL, salvo.getEmail(), papelAnterior + " → " + salvo.getPapel());
        }
        if (estavaAtivo && !salvo.getAtivo()) {
            historico.registrar(autor, INATIVACAO_CONTA, salvo.getEmail(), "Conta inativada");
        }
        return UsuarioResponse.from(salvo);
    }

    @Transactional
    public void alterarSenha(UUID id, AlterarSenhaRequest request) {
        var usuario = exigirUsuario(usuarios.findByIdParaAtualizar(id));
        usuario.setSenhaHash(passwordEncoder.encode(request.password()));
        usuarios.save(usuario);
    }

    private Usuario exigirUsuario(Optional<Usuario> usuario) {
        return usuario.orElseThrow(() -> new ResponseStatusException(
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
