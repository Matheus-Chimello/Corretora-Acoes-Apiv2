package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.repository.AcaoRepository;
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
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AcaoServiceTest {

    @Mock
    private AcaoRepository acaoRepository;

    @Mock
    private CotacaoAcaoPort cotacaoAcaoPort;

    @InjectMocks
    private AcaoService acaoService;

    @Test
    @DisplayName("Deve cadastrar uma acao no catalogo do usuario autenticado")
    void deveCadastrarAcaoNoCatalogoDoUsuario() {
        Usuario usuario = usuario();
        when(acaoRepository.existsByUsuarioIdAndTicker(usuario.getId(), "PETR4")).thenReturn(false);
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(cotacao("PETR4", "BRL", "35.50"));
        when(acaoRepository.save(any(Acao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Acao resultado = acaoService.cadastrarAcao(usuario, "petr4", "br");

        assertEquals("PETR4", resultado.getTicker());
        assertEquals("BR", resultado.getMercado());
        assertSame(usuario, resultado.getUsuario());
        assertEquals(0, new BigDecimal("35.50").compareTo(resultado.getCotacaoAtual()));
        assertTrue(resultado.getDataHoraCotacao() != null);
    }

    @Test
    @DisplayName("Nao deve permitir ticker duplicado no catalogo do mesmo usuario")
    void naoDevePermitirTickerDuplicadoNoMesmoCatalogo() {
        Usuario usuario = usuario();
        when(acaoRepository.existsByUsuarioIdAndTicker(usuario.getId(), "PETR4")).thenReturn(true);

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> acaoService.cadastrarAcao(usuario, "PETR4", "BR")
        );

        assertTrue(erro.getMessage().contains("ticker"));
        verify(cotacaoAcaoPort, never()).getCotacao(any(), any());
    }

    @Test
    @DisplayName("Deve permitir o mesmo ticker em catalogos de usuarios diferentes")
    void devePermitirMesmoTickerEmCatalogosDiferentes() {
        Usuario primeiroUsuario = usuario();
        Usuario segundoUsuario = usuario();
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(cotacao("PETR4", "BRL", "35.50"));
        when(acaoRepository.save(any(Acao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Acao primeiraAcao = acaoService.cadastrarAcao(primeiroUsuario, "PETR4", "BR");
        Acao segundaAcao = acaoService.cadastrarAcao(segundoUsuario, "PETR4", "BR");

        assertSame(primeiroUsuario, primeiraAcao.getUsuario());
        assertSame(segundoUsuario, segundaAcao.getUsuario());
        verify(acaoRepository).existsByUsuarioIdAndTicker(primeiroUsuario.getId(), "PETR4");
        verify(acaoRepository).existsByUsuarioIdAndTicker(segundoUsuario.getId(), "PETR4");
    }

    @Test
    @DisplayName("Nao deve cadastrar uma acao dos EUA no mercado brasileiro")
    void naoDeveCadastrarAcaoAmericanaNoMercadoBrasileiro() {
        Usuario usuario = usuario();
        when(acaoRepository.existsByUsuarioIdAndTicker(usuario.getId(), "NVDA")).thenReturn(false);
        when(cotacaoAcaoPort.getCotacao("NVDA", "BR")).thenReturn(cotacao("NVDA", "USD", "180.00"));

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> acaoService.cadastrarAcao(usuario, "NVDA", "BR")
        );

        assertTrue(erro.getMessage().contains("mercado US"));
        verify(acaoRepository, never()).save(any(Acao.class));
    }

    @Test
    @DisplayName("Nao deve cadastrar uma acao brasileira no mercado americano")
    void naoDeveCadastrarAcaoBrasileiraNoMercadoAmericano() {
        Usuario usuario = usuario();
        when(acaoRepository.existsByUsuarioIdAndTicker(usuario.getId(), "PETR4")).thenReturn(false);
        when(cotacaoAcaoPort.getCotacao("PETR4", "US")).thenReturn(cotacao("PETR4", "BRL", "35.50"));

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> acaoService.cadastrarAcao(usuario, "PETR4", "US")
        );

        assertTrue(erro.getMessage().contains("mercado BR"));
        verify(acaoRepository, never()).save(any(Acao.class));
    }

    @Test
    @DisplayName("Deve atualizar a cotacao de um ativo do catalogo do usuario")
    void deveAtualizarCotacaoDoAtivoDoUsuario() {
        Usuario usuario = usuario();
        UUID acaoId = UUID.randomUUID();
        Acao acao = acao(acaoId, usuario, "AAPL", "US", "180.00");
        when(acaoRepository.findByIdAndUsuarioId(acaoId, usuario.getId())).thenReturn(Optional.of(acao));
        when(cotacaoAcaoPort.getCotacao("AAPL", "US")).thenReturn(cotacao("AAPL", "USD", "190.00"));
        when(acaoRepository.save(acao)).thenReturn(acao);

        Acao resultado = acaoService.atualizarCotacao(usuario, acaoId);

        assertEquals(0, new BigDecimal("190.00").compareTo(resultado.getCotacaoAtual()));
    }

    @Test
    @DisplayName("Deve atualizar somente as cotacoes do catalogo do usuario")
    void deveAtualizarCotacoesDoCatalogoDoUsuario() {
        Usuario usuario = usuario();
        Acao petr4 = acao(UUID.randomUUID(), usuario, "PETR4", "BR", "35.00");
        Acao aapl = acao(UUID.randomUUID(), usuario, "AAPL", "US", "180.00");
        when(acaoRepository.findAllByUsuarioId(usuario.getId())).thenReturn(List.of(petr4, aapl));
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(cotacao("PETR4", "BRL", "36.00"));
        when(cotacaoAcaoPort.getCotacao("AAPL", "US")).thenReturn(cotacao("AAPL", "USD", "190.00"));
        when(acaoRepository.save(any(Acao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Acao> resultado = acaoService.atualizarCotacoesDoCatalogo(usuario);

        assertEquals(2, resultado.size());
        assertEquals(0, new BigDecimal("36.00").compareTo(petr4.getCotacaoAtual()));
        assertEquals(0, new BigDecimal("190.00").compareTo(aapl.getCotacaoAtual()));
        verify(cotacaoAcaoPort).getCotacao("PETR4", "BR");
        verify(cotacaoAcaoPort).getCotacao("AAPL", "US");
    }

    @Test
    @DisplayName("Deve listar somente os ativos do catalogo do usuario")
    void deveListarSomenteAtivosDoCatalogoDoUsuario() {
        Usuario usuario = usuario();
        when(acaoRepository.findAllByUsuarioId(usuario.getId())).thenReturn(List.of(
                acao(UUID.randomUUID(), usuario, "PETR4", "BR", "35.00"),
                acao(UUID.randomUUID(), usuario, "AAPL", "US", "180.00")
        ));

        assertEquals(2, acaoService.listarTodas(usuario).size());
    }

    @Test
    void deveRejeitarTickerOuMercadoAusente() {
        Usuario usuario = usuario();
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, null, "BR"));
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, " ", "BR"));
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", null));
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", " "));
        verify(cotacaoAcaoPort, never()).getCotacao(any(), any());
    }

    @Test
    void deveRejeitarCotacaoAusenteOuSemPreco() {
        Usuario usuario = usuario();
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(null)
                .thenReturn(new CotacaoAcaoPort.CotacaoInfo("PETR4", "Petrobras", "BRL", null));
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", "BR"));
        assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", "BR"));
        verify(acaoRepository, never()).save(any());
    }

    @Test
    void deveRejeitarMoedaDesconhecidaOuAusente() {
        Usuario usuario = usuario();
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR"))
                .thenReturn(new CotacaoAcaoPort.CotacaoInfo("PETR4", "Petrobras", null, BigDecimal.TEN))
                .thenReturn(new CotacaoAcaoPort.CotacaoInfo("PETR4", "Petrobras", "EUR", BigDecimal.TEN));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", "BR")).getMessage().contains("compativel"));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> acaoService.cadastrarAcao(usuario, "PETR4", "BR")).getMessage().contains("compativel"));
    }

    @Test
    void usaTickerComoNomeQuandoFornecedorNaoInformaEmpresa() {
        Usuario usuario = usuario();
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(new CotacaoAcaoPort.CotacaoInfo("PETR4", null, "brl", BigDecimal.TEN));
        when(acaoRepository.save(any(Acao.class))).thenAnswer(invocation -> invocation.getArgument(0));
        assertEquals("PETR4", acaoService.cadastrarAcao(usuario, "petr4", "br").getNomeEmpresa());
    }

    @Test
    void buscaTickerNormalizadoEIgnoraBuscaVazia() {
        Usuario usuario = usuario();
        Acao acao = acao(UUID.randomUUID(), usuario, "PETR4", "BR", "10");
        when(acaoRepository.findByUsuarioIdAndTicker(usuario.getId(), "PETR4")).thenReturn(Optional.of(acao));
        assertTrue(acaoService.buscarPorTicker(usuario, null).isEmpty());
        assertTrue(acaoService.buscarPorTicker(usuario, " ").isEmpty());
        assertSame(acao, acaoService.buscarPorTicker(usuario, " petr4 ").orElseThrow());
    }

    @Test
    void naoAtualizaAcaoDeOutroUsuarioOuInexistente() {
        Usuario usuario = usuario();
        assertThrows(IllegalArgumentException.class, () -> acaoService.atualizarCotacao(usuario, UUID.randomUUID()));
        verify(cotacaoAcaoPort, never()).getCotacao(any(), any());
    }

    @Test
    void preservaNomeExistenteQuandoCotacaoNaoInformaNome() {
        Usuario usuario = usuario();
        UUID id = UUID.randomUUID();
        Acao acao = acao(id, usuario, "PETR4", "BR", "10");
        acao.setNomeEmpresa("Petrobras");
        when(acaoRepository.findByIdAndUsuarioId(id, usuario.getId())).thenReturn(Optional.of(acao));
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(new CotacaoAcaoPort.CotacaoInfo("PETR4", null, "BRL", BigDecimal.TEN));
        when(acaoRepository.save(acao)).thenReturn(acao);
        assertEquals("Petrobras", acaoService.atualizarCotacao(usuario, id).getNomeEmpresa());
    }

    private Acao acao(UUID id, Usuario usuario, String ticker, String mercado, String cotacaoAtual) {
        Acao acao = new Acao();
        acao.setId(id);
        acao.setUsuario(usuario);
        acao.setTicker(ticker);
        acao.setMercado(mercado);
        acao.setCotacaoAtual(new BigDecimal(cotacaoAtual));
        return acao;
    }

    private CotacaoAcaoPort.CotacaoInfo cotacao(String ticker, String moeda, String valor) {
        return new CotacaoAcaoPort.CotacaoInfo(ticker, "Empresa", moeda, new BigDecimal(valor));
    }

    private Usuario usuario() {
        Usuario usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        return usuario;
    }
}
