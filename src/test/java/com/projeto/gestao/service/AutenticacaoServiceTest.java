package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import com.projeto.gestao.config.JwtProperties;
import com.projeto.gestao.config.SecurityConfig;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.Duration;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutenticacaoServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CarteiraRepository carteiraRepository;

    private AutenticacaoService autenticacaoService;

    @BeforeEach
    void configurarSeguranca() {
        var encoder = new BCryptPasswordEncoder();
        var provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(new UsuarioDetailsService(usuarioRepository));
        provider.setPasswordEncoder(encoder);
        var properties = new JwtProperties("chave-de-testes-com-pelo-menos-32-bytes", Duration.ofHours(1), "teste");
        var config = new SecurityConfig();
        autenticacaoService = new AutenticacaoService(usuarioRepository, carteiraRepository, encoder,
                new ProviderManager(provider), config.jwtEncoder(config.jwtSecretKey(properties)), properties);
    }

    @AfterEach
    void limparContexto() { SecurityContextHolder.clearContext(); }

    @Test
    @DisplayName("Deve criar uma carteira zerada ao registrar uma conta")
    void deveCriarCarteiraZeradaAoRegistrar() {
        when(usuarioRepository.findByEmailIgnoreCase("nova@teste.local")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(UUID.randomUUID());
            return usuario;
        });
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario usuario = autenticacaoService.registrar("Nova Conta", "nova@teste.local", "senha1234");

        ArgumentCaptor<Carteira> carteiraCaptor = ArgumentCaptor.forClass(Carteira.class);
        verify(carteiraRepository).save(carteiraCaptor.capture());
        Carteira carteira = carteiraCaptor.getValue();
        assertEquals(usuario, carteira.getUsuario());
        assertEquals(BigDecimal.ZERO, carteira.getSaldoAcao());
        assertEquals(BigDecimal.ZERO, carteira.getSaldoEmConta());
        assertNotNull(usuario.getSenhaHash());
    }

    @Test
    void deveNormalizarDadosEProtegerSenhaAoRegistrar() {
        when(usuarioRepository.findByEmailIgnoreCase("nova@teste.local")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario usuario = autenticacaoService.registrar("  Nova Conta  ", " NOVA@TESTE.LOCAL ", "senha1234");

        assertEquals("Nova Conta", usuario.getNome());
        assertEquals("nova@teste.local", usuario.getEmail());
        assertEquals(PapelUsuario.USER, usuario.getPapel());
        assertTrue(new BCryptPasswordEncoder().matches("senha1234", usuario.getSenhaHash()));
    }

    @Test
    void deveRecusarDadosInvalidosSemCriarConta() {
        for (String[] dados : new String[][] {
                {"", "a@teste.local", "senha1234"},
                {"Nome", "", "senha1234"},
                {"Nome", "a@teste.local", ""},
                {"Nome", "email-invalido", "senha1234"},
                {"Nome", "a@teste.local", "1234567"},
                {"Nome", "a@teste.local", "s".repeat(73)}
        }) {
            ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                    () -> autenticacaoService.registrar(dados[0], dados[1], dados[2]));
            assertEquals(HttpStatus.BAD_REQUEST, erro.getStatusCode());
        }
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.registrar(null, null, null)).getStatusCode());
        verify(usuarioRepository, never()).save(any());
        verify(carteiraRepository, never()).save(any());
    }

    @Test
    void deveRecusarEmailJaCadastrado() {
        when(usuarioRepository.findByEmailIgnoreCase("a@teste.local")).thenReturn(Optional.of(new Usuario()));
        ResponseStatusException erro = assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.registrar("Nome", "A@teste.local", "senha1234"));
        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        verify(carteiraRepository, never()).save(any());
    }

    @Test
    void deveAutenticarSemPersistirTokenEEncerrarSessaoNoCliente() {
        Usuario usuario = new Usuario();
        usuario.setNome("Pessoa");
        usuario.setEmail("pessoa@teste.local");
        usuario.setPapel(PapelUsuario.USER);
        usuario.setSenhaHash(new BCryptPasswordEncoder().encode("senha1234"));
        when(usuarioRepository.findByEmailIgnoreCase("pessoa@teste.local")).thenReturn(Optional.of(usuario));

        var resposta = autenticacaoService.login(" PESSOA@TESTE.LOCAL ", "senha1234");
        assertNotNull(resposta.token());
        assertEquals("Pessoa", resposta.nome());
        assertEquals("USER", resposta.role());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(usuario.getEmail(), null, java.util.List.of()));
        assertEquals(usuario, autenticacaoService.obterUsuarioAutenticado("Bearer " + resposta.token()));

        autenticacaoService.encerrarSessao("Bearer " + resposta.token());
        verify(usuarioRepository, never()).save(usuario);
    }

    @Test
    void deveRecusarCredenciaisInvalidas() {
        when(usuarioRepository.findByEmailIgnoreCase("ausente@teste.local")).thenReturn(Optional.empty());
        assertThrows(AuthenticationException.class,
                () -> autenticacaoService.login("ausente@teste.local", "senha1234"));

        Usuario usuario = new Usuario();
        usuario.setEmail("pessoa@teste.local");
        usuario.setPapel(PapelUsuario.USER);
        usuario.setSenhaHash(new BCryptPasswordEncoder().encode("senha1234"));
        when(usuarioRepository.findByEmailIgnoreCase("pessoa@teste.local")).thenReturn(Optional.of(usuario));
        assertThrows(AuthenticationException.class,
                () -> autenticacaoService.login("pessoa@teste.local", "errada"));
        assertThrows(AuthenticationException.class, () -> autenticacaoService.login("pessoa@teste.local", null));
    }

    @Test
    void deveExigirIdentidadeAutenticadaEExistente() {
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.obterUsuarioAutenticado(null)).getStatusCode());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("pessoa@teste.local", "senha"));
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.obterUsuarioAutenticado(null)).getStatusCode());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "ausente@teste.local", null, java.util.List.of()));
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.obterUsuarioAutenticado(null)).getStatusCode());
    }

    @Test
    void deveReaproveitarContaPadraoExistente() {
        Usuario usuario = new Usuario();
        when(usuarioRepository.findByEmailIgnoreCase("a@teste.local")).thenReturn(Optional.of(usuario));
        assertEquals(usuario, autenticacaoService.garantirUsuarioPadrao("Nome", "A@teste.local", "senha1234", PapelUsuario.USER));
        verify(usuarioRepository, never()).save(any());
    }
}
