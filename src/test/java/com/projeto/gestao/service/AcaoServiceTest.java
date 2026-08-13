package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.repository.AcaoRepository;
import com.projeto.gestao.repository.CorretoraRepository;
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
    private CorretoraRepository corretoraRepository;

    @Mock
    private CotacaoAcaoPort cotacaoAcaoPort;

    @InjectMocks
    private AcaoService acaoService;

    @Test
    @DisplayName("Deve cadastrar uma acao no catalogo global")
    void deveCadastrarAcaoNoCatalogoGlobal() {
        UUID corretoraId = UUID.randomUUID();
        when(acaoRepository.existsByTicker("PETR4")).thenReturn(false);
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora(corretoraId, true)));
        when(cotacaoAcaoPort.getCotacao("PETR4", "BR")).thenReturn(cotacao("PETR4", "35.50"));
        when(acaoRepository.save(any(Acao.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Acao resultado = acaoService.cadastrarAcao("petr4", "br", corretoraId);

        assertEquals("PETR4", resultado.getTicker());
        assertEquals("BR", resultado.getMercado());
        assertEquals(0, new BigDecimal("35.50").compareTo(resultado.getCotacaoAtual()));
    }

    @Test
    @DisplayName("Nao deve permitir ticker duplicado no catalogo global")
    void naoDevePermitirTickerDuplicadoNoCatalogoGlobal() {
        when(acaoRepository.existsByTicker("PETR4")).thenReturn(true);

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> acaoService.cadastrarAcao("PETR4", "BR", UUID.randomUUID())
        );

        assertTrue(erro.getMessage().contains("ticker"));
        verify(cotacaoAcaoPort, never()).getCotacao(any(), any());
    }

    @Test
    @DisplayName("Nao deve cadastrar acao em corretora sem validacao CVM")
    void naoDeveCadastrarAcaoComCorretoraNaoValidada() {
        UUID corretoraId = UUID.randomUUID();
        when(acaoRepository.existsByTicker("PETR4")).thenReturn(false);
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora(corretoraId, false)));

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> acaoService.cadastrarAcao("PETR4", "BR", corretoraId)
        );

        assertTrue(erro.getMessage().contains("validadas"));
        verify(cotacaoAcaoPort, never()).getCotacao(any(), any());
    }

    @Test
    @DisplayName("Deve atualizar a cotacao do ativo global")
    void deveAtualizarCotacaoDoAtivoGlobal() {
        UUID acaoId = UUID.randomUUID();
        Acao acao = acao(acaoId, "AAPL", "US", "180.00");
        when(acaoRepository.findById(acaoId)).thenReturn(Optional.of(acao));
        when(cotacaoAcaoPort.getCotacao("AAPL", "US")).thenReturn(cotacao("AAPL", "190.00"));
        when(acaoRepository.save(acao)).thenReturn(acao);

        Acao resultado = acaoService.atualizarCotacao(acaoId);

        assertEquals(0, new BigDecimal("190.00").compareTo(resultado.getCotacaoAtual()));
    }

    @Test
    @DisplayName("Deve listar todos os ativos do catalogo")
    void deveListarTodosAtivosDoCatalogo() {
        when(acaoRepository.findAll()).thenReturn(List.of(
                acao(UUID.randomUUID(), "PETR4", "BR", "35.00"),
                acao(UUID.randomUUID(), "AAPL", "US", "180.00")
        ));

        assertEquals(2, acaoService.listarTodas().size());
    }

    private Corretora corretora(UUID id, boolean validadaNaCvm) {
        Corretora corretora = new Corretora();
        corretora.setId(id);
        corretora.setValidadaNaCvm(validadaNaCvm);
        return corretora;
    }

    private Acao acao(UUID id, String ticker, String mercado, String cotacaoAtual) {
        Acao acao = new Acao();
        acao.setId(id);
        acao.setTicker(ticker);
        acao.setMercado(mercado);
        acao.setCotacaoAtual(new BigDecimal(cotacaoAtual));
        return acao;
    }

    private CotacaoAcaoPort.CotacaoInfo cotacao(String ticker, String valor) {
        return new CotacaoAcaoPort.CotacaoInfo(ticker, "Empresa", "BRL", new BigDecimal(valor));
    }
}
