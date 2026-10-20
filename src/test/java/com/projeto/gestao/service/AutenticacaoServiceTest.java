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
import org.mockito.InjectMocks;
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
import static org.junit.jupiter.api.Assertions.assertNull;
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

    @InjectMocks
    private AutenticacaoService autenticacaoService;

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

        Usuario usuario = autenticacaoService.registrar("Nova Conta", "nova@teste.local", "senha123");

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

        Usuario usuario = autenticacaoService.registrar("  Nova Conta  ", " NOVA@TESTE.LOCAL ", "senha123");

        assertEquals("Nova Conta", usuario.getNome());
        assertEquals("nova@teste.local", usuario.getEmail());
        assertEquals(PapelUsuario.USER, usuario.getPapel());
        assertTrue(new BCryptPasswordEncoder().matches("senha123", usuario.getSenhaHash()));
    }

    @Test
    void deveRecusarDadosInvalidosSemCriarConta() {
        for (String[] dados : new String[][] {
                {"", "a@teste.local", "senha123"},
                {"Nome", "", "senha123"},
                {"Nome", "a@teste.local", ""},
                {"Nome", "email-invalido", "senha123"},
                {"Nome", "a@teste.local", "12345"}
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
                () -> autenticacaoService.registrar("Nome", "A@teste.local", "senha123"));
        assertEquals(HttpStatus.CONFLICT, erro.getStatusCode());
        verify(carteiraRepository, never()).save(any());
    }

    @Test
    void deveAutenticarEEncerrarSessao() {
        Usuario usuario = new Usuario();
        usuario.setNome("Pessoa");
        usuario.setEmail("pessoa@teste.local");
        usuario.setPapel(PapelUsuario.USER);
        usuario.setSenhaHash(new BCryptPasswordEncoder().encode("senha123"));
        when(usuarioRepository.findByEmailIgnoreCase("pessoa@teste.local")).thenReturn(Optional.of(usuario));

        var resposta = autenticacaoService.login(" PESSOA@TESTE.LOCAL ", "senha123");
        assertNotNull(resposta.token());
        assertEquals("Pessoa", resposta.nome());
        assertEquals("USER", resposta.role());
        when(usuarioRepository.findByTokenSessao(resposta.token())).thenReturn(Optional.of(usuario));
        assertEquals(usuario, autenticacaoService.obterUsuarioAutenticado("Bearer " + resposta.token()));

        autenticacaoService.encerrarSessao("Bearer " + resposta.token());
        assertNull(usuario.getTokenSessao());
    }

    @Test
    void deveRecusarCredenciaisEAutorizacoesInvalidas() {
        when(usuarioRepository.findByEmailIgnoreCase("ausente@teste.local")).thenReturn(Optional.empty());
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.login("ausente@teste.local", "senha123")).getStatusCode());

        Usuario usuario = new Usuario();
        usuario.setSenhaHash(new BCryptPasswordEncoder().encode("senha123"));
        when(usuarioRepository.findByEmailIgnoreCase("pessoa@teste.local")).thenReturn(Optional.of(usuario));
        assertEquals(HttpStatus.UNAUTHORIZED, assertThrows(ResponseStatusException.class,
                () -> autenticacaoService.login("pessoa@teste.local", "errada")).getStatusCode());
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.login("pessoa@teste.local", null));
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.obterUsuarioAutenticado(null));
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.obterUsuarioAutenticado("Basic token"));
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.obterUsuarioAutenticado("Bearer   "));
        when(usuarioRepository.findByTokenSessao("invalido")).thenReturn(Optional.empty());
        assertThrows(ResponseStatusException.class, () -> autenticacaoService.obterUsuarioAutenticado("Bearer invalido"));
    }

    @Test
    void deveReaproveitarContaPadraoExistente() {
        Usuario usuario = new Usuario();
        when(usuarioRepository.findByEmailIgnoreCase("a@teste.local")).thenReturn(Optional.of(usuario));
        assertEquals(usuario, autenticacaoService.garantirUsuarioPadrao("Nome", "A@teste.local", "senha123", PapelUsuario.USER));
        verify(usuarioRepository, never()).save(any());
    }
}
