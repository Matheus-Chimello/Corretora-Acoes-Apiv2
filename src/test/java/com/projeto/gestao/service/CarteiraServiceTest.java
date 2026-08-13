package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.PosicaoCarteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.PosicaoCarteiraRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CarteiraServiceTest {

    @Mock
    private CarteiraRepository carteiraRepository;

    @Mock
    private PosicaoCarteiraRepository posicaoCarteiraRepository;

    @Mock
    private AcaoService acaoService;

    @InjectMocks
    private CarteiraService carteiraService;

    private Usuario usuario;
    private Carteira carteira;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        carteira = carteira(new BigDecimal("100.00"));
        carteira.setId(7L);
    }

    @Test
    @DisplayName("Deve criar carteira zerada quando o usuario nao possui uma")
    void deveCriarCarteiraZerada() {
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.empty());
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Carteira resultado = carteiraService.buscarCarteiraPrincipal(usuario);

        assertEquals(usuario, resultado.getUsuario());
        assertEquals(BigDecimal.ZERO, resultado.getSaldoAcao());
        assertEquals(BigDecimal.ZERO, resultado.getSaldoEmConta());
    }

    @Test
    @DisplayName("Deve comprar ativo no catalogo para a carteira do investidor")
    void deveComprarAtivoParaCarteiraDoInvestidor() {
        UUID acaoId = UUID.randomUUID();
        Acao acao = acao(acaoId, "PETR4", "10.00");
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(acaoId)).thenReturn(acao);
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoId(7L, acaoId)).thenReturn(Optional.empty());
        when(posicaoCarteiraRepository.save(any(PosicaoCarteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenAnswer(invocation -> List.of());

        PosicaoCarteira resultado = carteiraService.comprarAcao(usuario, acaoId, new BigDecimal("2"));

        assertEquals(0, new BigDecimal("2").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("80.00").compareTo(carteira.getSaldoEmConta()));
    }

    @Test
    @DisplayName("Nao deve comprar quando o saldo em conta for insuficiente")
    void naoDeveComprarComSaldoInsuficiente() {
        UUID acaoId = UUID.randomUUID();
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(acaoId)).thenReturn(acao(acaoId, "PETR4", "60.00"));

        assertThrows(
                IllegalArgumentException.class,
                () -> carteiraService.comprarAcao(usuario, acaoId, new BigDecimal("2"))
        );
    }

    @Test
    @DisplayName("Deve vender apenas a posicao da carteira autenticada")
    void deveVenderPosicaoDaCarteiraAutenticada() {
        Acao acao = acao(UUID.randomUUID(), "PETR4", "10.00");
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        posicao.setQuantidadeTotal(new BigDecimal("3"));
        posicao.setPrecoMedio(new BigDecimal("8.00"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoTickerIgnoreCase(7L, "PETR4")).thenReturn(Optional.of(posicao));
        when(acaoService.atualizarCotacao(acao.getId())).thenReturn(acao);
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.save(posicao)).thenReturn(posicao);
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of(posicao));

        PosicaoCarteira resultado = carteiraService.venderAcao(usuario, "PETR4", new BigDecimal("1"));

        assertEquals(0, new BigDecimal("2").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("110.00").compareTo(carteira.getSaldoEmConta()));
    }

    @Test
    @DisplayName("Deve adicionar saldo a carteira do investidor")
    void deveAdicionarSaldoNaCarteira() {
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(carteiraRepository.save(carteira)).thenReturn(carteira);

        Carteira resultado = carteiraService.realizarAporte(usuario, new BigDecimal("25.00"));

        assertEquals(0, new BigDecimal("125.00").compareTo(resultado.getSaldoEmConta()));
    }

    private Carteira carteira(BigDecimal saldoEmConta) {
        Carteira valor = new Carteira();
        valor.setUsuario(usuario);
        valor.setSaldoAcao(BigDecimal.ZERO);
        valor.setSaldoEmConta(saldoEmConta);
        return valor;
    }

    private Acao acao(UUID id, String ticker, String cotacao) {
        Acao acao = new Acao();
        acao.setId(id);
        acao.setTicker(ticker);
        acao.setMercado("BR");
        acao.setCotacaoAtual(new BigDecimal(cotacao));
        return acao;
    }
}
