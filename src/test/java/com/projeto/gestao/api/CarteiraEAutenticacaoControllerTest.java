package com.projeto.gestao.api;

import com.projeto.gestao.api.controller.AutenticacaoController;
import com.projeto.gestao.api.controller.CarteiraController;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CarteiraService;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CarteiraEAutenticacaoControllerTest {
    private final AutenticacaoService auth = mock(AutenticacaoService.class);
    private final CarteiraService carteiras = mock(CarteiraService.class);
    private final Usuario usuario = new Usuario();

    @Test
    void alteraSaldoApenasComNumeroValido() {
        when(auth.obterUsuarioAutenticado("token")).thenReturn(usuario);
        CarteiraController controller = new CarteiraController(carteiras, auth);
        Carteira carteira = new Carteira();
        when(carteiras.atualizarSaldoEmConta(usuario, 1L, new BigDecimal("100.50"))).thenReturn(carteira);
        assertSame(carteira, controller.atualizarSaldoEmConta("token", 1L, Map.of("saldoEmConta", "100.50")).getBody());
        assertThrows(IllegalArgumentException.class, () -> controller.atualizarSaldoEmConta("token", 1L, Map.of()));
        assertThrows(IllegalArgumentException.class, () -> controller.atualizarSaldoEmConta("token", 1L, Map.of("saldoEmConta", " ")));
        assertThrows(IllegalArgumentException.class, () -> controller.atualizarSaldoEmConta("token", 1L, Map.of("saldoEmConta", "abc")));
        verify(carteiras, times(1)).atualizarSaldoEmConta(any(), anyLong(), any());
    }

    @Test
    void buscaCarteiraSomenteParaUsuarioAutenticado() {
        when(auth.obterUsuarioAutenticado("token")).thenReturn(usuario);
        when(carteiras.buscarPorId(usuario, 1L)).thenReturn(Optional.of(new Carteira())).thenReturn(Optional.empty());
        CarteiraController controller = new CarteiraController(carteiras, auth);
        assertEquals(200, controller.buscarPorId("token", 1L).getStatusCode().value());
        assertEquals(404, controller.buscarPorId("token", 1L).getStatusCode().value());
    }

    @Test
    void exigeConfirmacaoDeSenhaNoRegistro() {
        AutenticacaoController controller = new AutenticacaoController(auth);
        assertThrows(IllegalArgumentException.class, () -> controller.registrar(Map.of("confirmPassword", "x")));
        assertThrows(IllegalArgumentException.class, () -> controller.registrar(Map.of("password", "x", "confirmPassword", "y")));
        when(auth.registrar("Nome", "email", "senha")).thenReturn(usuario);
        var resposta = new AutenticacaoService.RespostaAutenticacao("token", "Nome", "email", "USER");
        when(auth.resposta(usuario)).thenReturn(resposta);
        assertEquals(201, controller.registrar(Map.of("name", "Nome", "email", "email", "password", "senha", "confirmPassword", "senha")).getStatusCode().value());
        verify(auth).registrar("Nome", "email", "senha");
    }

    @Test
    void loginELogoutUsamServicoDeAutenticacao() {
        AutenticacaoController controller = new AutenticacaoController(auth);
        var resposta = new AutenticacaoService.RespostaAutenticacao("token", "Nome", "email", "USER");
        when(auth.login("email", "senha")).thenReturn(resposta);
        assertEquals(resposta, controller.login(Map.of("email", "email", "password", "senha")).getBody());
        assertEquals(204, controller.logout("token").getStatusCode().value());
        verify(auth).encerrarSessao("token");
    }
}
