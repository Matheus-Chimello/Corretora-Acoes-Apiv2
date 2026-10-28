package com.projeto.gestao.service;

import com.projeto.gestao.domain.dto.UsuarioCreateRequest;
import com.projeto.gestao.domain.dto.UsuarioUpdateRequest;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.server.ResponseStatusException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class UsuarioServiceTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final UsuarioService service = new UsuarioService(usuarios, new BCryptPasswordEncoder());

    @Test
    void deveRecusarEmailDuplicadoIgnorandoMaiusculas() {
        var existente = new Usuario();
        existente.setId(java.util.UUID.randomUUID());
        when(usuarios.findByEmailIgnoreCase("pessoa@teste.local")).thenReturn(Optional.of(existente));
        assertThatThrownBy(() -> service.create(new UsuarioCreateRequest("Pessoa", " PESSOA@TESTE.LOCAL ",
                "senha-de-teste", PapelUsuario.USER)))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("email");
        verify(usuarios, never()).save(any());
    }

    @Test
    void deveManterProprioEmailNaAtualizacaoSemAlterarHash() {
        var usuario = usuario("pessoa@teste.local");
        when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(usuarios.findByEmailIgnoreCase(usuario.getEmail())).thenReturn(Optional.of(usuario));
        when(usuarios.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var response = service.update(usuario.getId(), new UsuarioUpdateRequest(" Nome novo ",
                " PESSOA@TESTE.LOCAL ", PapelUsuario.ADMIN, false));
        assertThat(response.nome()).isEqualTo("Nome novo");
        assertThat(response.email()).isEqualTo("pessoa@teste.local");
        assertThat(response.papel()).isEqualTo(PapelUsuario.ADMIN);
        assertThat(response.ativo()).isFalse();
        assertThat(usuario.getSenhaHash()).isEqualTo("hash-original");
    }

    @Test
    void deveRecusarEmailDeOutraPessoaNaAtualizacao() {
        var usuario = usuario("pessoa@teste.local");
        var outro = usuario("outra@teste.local");
        when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(usuarios.findByEmailIgnoreCase(outro.getEmail())).thenReturn(Optional.of(outro));
        assertThatThrownBy(() -> service.update(usuario.getId(), new UsuarioUpdateRequest(
                "Pessoa", outro.getEmail(), PapelUsuario.USER, true)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(usuario.getEmail()).isEqualTo("pessoa@teste.local");
        verify(usuarios, never()).save(any());
    }

    @Test
    void devePermitirTrocarParaEmailDisponivel() {
        var usuario = usuario("pessoa@teste.local");
        when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        when(usuarios.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var response = service.update(usuario.getId(), new UsuarioUpdateRequest(
                "Pessoa", "nova@teste.local", PapelUsuario.USER, true));
        assertThat(response.email()).isEqualTo("nova@teste.local");
    }

    @Test
    void deveRecusarAtualizacaoDeIdInexistente() {
        assertThatThrownBy(() -> service.update(UUID.randomUUID(), new UsuarioUpdateRequest(
                "Pessoa", "pessoa@teste.local", PapelUsuario.USER, true)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode().value()).isEqualTo(404));
    }

    private Usuario usuario(String email) {
        var usuario = new Usuario();
        usuario.setId(UUID.randomUUID()); usuario.setNome("Pessoa"); usuario.setEmail(email);
        usuario.setPapel(PapelUsuario.USER); usuario.setSenhaHash("hash-original");
        return usuario;
    }
}
