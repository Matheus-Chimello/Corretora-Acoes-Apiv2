package com.projeto.gestao.infra.adapter;

import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.infra.client.AlphaVantageClient;
import com.projeto.gestao.infra.client.BrapiClient;
import com.projeto.gestao.infra.client.dto.AlphaVantageResponseDto;
import com.projeto.gestao.infra.client.dto.BrapiResponseDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CotacaoAcaoAdapterTest {

    @Mock
    private BrapiClient brapiClient;

    @Mock
    private AlphaVantageClient alphaVantageClient;

    @InjectMocks
    private CotacaoAcaoAdapter cotacaoAcaoAdapter;

    @Test
    void deveExigirTokenBrapiParaCotacaoBrasileira() {
        ReflectionTestUtils.setField(cotacaoAcaoAdapter, "brapiToken", "");

        IllegalArgumentException erro = assertThrows(
                IllegalArgumentException.class,
                () -> cotacaoAcaoAdapter.getCotacao("ABEV3", "BR")
        );

        assertEquals("A chave BRAPI_TOKEN deve ser configurada para consultar acoes BR.", erro.getMessage());
    }

    @Test
    void deveEnviarTokenBrapiNoCabecalhoAuthorization() {
        ReflectionTestUtils.setField(cotacaoAcaoAdapter, "brapiToken", "token-de-teste");
        BrapiResponseDto resposta = new BrapiResponseDto();
        BrapiResponseDto.BrapiResultDto resultado = new BrapiResponseDto.BrapiResultDto();
        resultado.setSymbol("ABEV3");
        resultado.setShortName("Ambev");
        resultado.setCurrency("BRL");
        resultado.setRegularMarketPrice(new BigDecimal("12.50"));
        resposta.setResults(List.of(resultado));
        when(brapiClient.consultarCotacao("ABEV3", "Bearer token-de-teste")).thenReturn(resposta);

        CotacaoAcaoPort.CotacaoInfo cotacao = cotacaoAcaoAdapter.getCotacao("ABEV3", "BR");

        assertEquals(new BigDecimal("12.50"), cotacao.cotacaoAtual());
        verify(brapiClient).consultarCotacao(eq("ABEV3"), eq("Bearer token-de-teste"));
    }

    @Test
    void deveConsultarCotacaoAmericanaComGlobalQuote() {
        ReflectionTestUtils.setField(cotacaoAcaoAdapter, "alphaVantageKey", "chave-de-teste");
        AlphaVantageResponseDto resposta = new AlphaVantageResponseDto();
        AlphaVantageResponseDto.GlobalQuote quote = new AlphaVantageResponseDto.GlobalQuote();
        quote.setSymbol("NVDA");
        quote.setPrice(new BigDecimal("228.45"));
        resposta.setGlobalQuote(quote);
        when(alphaVantageClient.consultarCotacao("GLOBAL_QUOTE", "NVDA", "chave-de-teste")).thenReturn(resposta);

        CotacaoAcaoPort.CotacaoInfo cotacao = cotacaoAcaoAdapter.getCotacao("NVDA", "US");

        assertEquals("NVDA", cotacao.ticker());
        assertEquals(new BigDecimal("228.45"), cotacao.cotacaoAtual());
        verify(alphaVantageClient).consultarCotacao(eq("GLOBAL_QUOTE"), eq("NVDA"), eq("chave-de-teste"));
    }

    @Test
    void deveUsarBrapiParaCotacaoAmericanaQuandoTokenEstaConfigurado() {
        ReflectionTestUtils.setField(cotacaoAcaoAdapter, "brapiToken", "token-de-teste");
        BrapiResponseDto resposta = new BrapiResponseDto();
        BrapiResponseDto.BrapiResultDto resultado = new BrapiResponseDto.BrapiResultDto();
        resultado.setSymbol("NVDA");
        resultado.setShortName("NVIDIA Corporation");
        resultado.setCurrency("USD");
        resultado.setRegularMarketPrice(new BigDecimal("233.24"));
        resposta.setResults(List.of(resultado));
        when(brapiClient.consultarCotacao("NVDA", "Bearer token-de-teste")).thenReturn(resposta);

        CotacaoAcaoPort.CotacaoInfo cotacao = cotacaoAcaoAdapter.getCotacao("NVDA", "US");

        assertEquals("USD", cotacao.moeda());
        assertEquals(new BigDecimal("233.24"), cotacao.cotacaoAtual());
        verify(brapiClient).consultarCotacao(eq("NVDA"), eq("Bearer token-de-teste"));
    }
}
