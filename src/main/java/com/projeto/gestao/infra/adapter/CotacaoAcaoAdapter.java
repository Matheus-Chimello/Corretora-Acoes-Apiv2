package com.projeto.gestao.infra.adapter;

import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.infra.client.AlphaVantageClient;
import com.projeto.gestao.infra.client.BrapiClient;
import com.projeto.gestao.infra.client.dto.AlphaVantageResponseDto;
import com.projeto.gestao.infra.client.dto.BrapiResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CotacaoAcaoAdapter implements CotacaoAcaoPort {

    private static final Logger log = LoggerFactory.getLogger(CotacaoAcaoAdapter.class);

    private final BrapiClient brapiClient;
    private final AlphaVantageClient alphaVantageClient;

    @Value("${api.brapi.token:}")
    private String brapiToken;

    @Value("${api.alphavantage.key:}")
    private String alphaVantageKey;

    public CotacaoAcaoAdapter(BrapiClient brapiClient, AlphaVantageClient alphaVantageClient) {
        this.brapiClient = brapiClient;
        this.alphaVantageClient = alphaVantageClient;
    }

    @Override
    public CotacaoInfo getCotacao(String ticker, String mercado) {
        if ("BR".equalsIgnoreCase(mercado)) {
            return consultarCotacaoComBrapi(ticker, "BR");
        } else if ("US".equalsIgnoreCase(mercado)) {
            try {
                return consultarCotacaoComBrapi(ticker, "US");
            } catch (Exception e) {
                log.warn("Brapi indisponível para ticker US={}; tentando Alpha Vantage: {}", ticker, e.getMessage());
                return consultarCotacaoComAlphaVantage(ticker);
            }
        }
        throw new IllegalArgumentException("Mercado inválido: '" + mercado + "'. Valores aceitos: BR, US.");
    }

    private CotacaoInfo consultarCotacaoComBrapi(String ticker, String mercado) {
        try {
            if (brapiToken == null || brapiToken.isBlank()) {
                throw new IllegalArgumentException("A chave BRAPI_TOKEN deve ser configurada para consultar acoes " + mercado + ".");
            }
            log.info("Consultando cotação {} para ticker={} via Brapi", mercado, ticker);
            BrapiResponseDto dto = brapiClient.consultarCotacao(ticker, "Bearer " + brapiToken.trim());
            if (dto != null && dto.getResults() != null && !dto.getResults().isEmpty()) {
                var result = dto.getResults().get(0);
                log.info("Cotação obtida: {} = {}", result.getSymbol(), result.getRegularMarketPrice());
                return new CotacaoInfo(result.getSymbol(), result.getShortName(), result.getCurrency(), result.getRegularMarketPrice());
            }
            throw new IllegalArgumentException("Ticker '" + ticker + "' não encontrado no mercado " + mercado + " (Brapi).");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao consultar Brapi para ticker={}: {} - {}", ticker, e.getClass().getSimpleName(), e.getMessage());
            throw new IllegalArgumentException("Erro ao consultar cotação " + mercado + " para '" + ticker + "': " + e.getMessage());
        }
    }

    private CotacaoInfo consultarCotacaoComAlphaVantage(String ticker) {
        try {
            if (alphaVantageKey == null || alphaVantageKey.isBlank()) {
                throw new IllegalArgumentException("A chave ALPHAVANTAGE_API_KEY deve ser configurada para consultar acoes US.");
            }
            log.info("Consultando cotação US para ticker={} via Alpha Vantage", ticker);
            AlphaVantageResponseDto dto = alphaVantageClient.consultarCotacao("GLOBAL_QUOTE", ticker, alphaVantageKey);
            if (dto != null && dto.getGlobalQuote() != null && dto.getGlobalQuote().getPrice() != null) {
                var quote = dto.getGlobalQuote();
                log.info("Cotação obtida: {} = {}", quote.getSymbol(), quote.getPrice());
                return new CotacaoInfo(quote.getSymbol(), ticker, "USD", quote.getPrice());
            }
            throw new IllegalArgumentException("Ticker '" + ticker + "' não encontrado no mercado US. Verifique as chaves configuradas.");
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao consultar Alpha Vantage para ticker={}: {} - {}", ticker, e.getClass().getSimpleName(), e.getMessage());
            throw new IllegalArgumentException("Erro ao consultar cotação US para '" + ticker + "': " + e.getMessage());
        }
    }
}
