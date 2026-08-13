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
            try {
                log.info("Consultando cotação BR para ticker={} via Brapi", ticker);
                BrapiResponseDto dto = brapiClient.consultarCotacao(ticker, brapiToken);
                if (dto != null && dto.getResults() != null && !dto.getResults().isEmpty()) {
                    var result = dto.getResults().get(0);
                    log.info("Cotação obtida: {} = {}", result.getSymbol(), result.getRegularMarketPrice());
                    return new CotacaoInfo(result.getSymbol(), result.getShortName(), result.getCurrency(), result.getRegularMarketPrice());
                }
                log.warn("Brapi retornou resposta vazia para ticker={}", ticker);
                throw new IllegalArgumentException("Ticker '" + ticker + "' não encontrado no mercado BR (Brapi).");
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                log.error("Erro ao consultar Brapi para ticker={}: {} - {}", ticker, e.getClass().getSimpleName(), e.getMessage());
                throw new IllegalArgumentException("Erro ao consultar cotação BR para '" + ticker + "': " + e.getMessage());
            }
        } else if ("US".equalsIgnoreCase(mercado)) {
            try {
                if (alphaVantageKey == null || alphaVantageKey.isBlank()) {
                    throw new IllegalArgumentException("A chave ALPHAVANTAGE_API_KEY deve ser configurada para consultar acoes US.");
                }
                log.info("Consultando cotação US para ticker={} via Alpha Vantage", ticker);
                AlphaVantageResponseDto dto = alphaVantageClient.consultarCotacao(ticker, alphaVantageKey);
                if (dto != null && dto.getGlobalQuote() != null && dto.getGlobalQuote().getPrice() != null) {
                    var quote = dto.getGlobalQuote();
                    log.info("Cotação obtida: {} = {}", quote.getSymbol(), quote.getPrice());
                    return new CotacaoInfo(quote.getSymbol(), ticker, "USD", quote.getPrice());
                }
                log.warn("Alpha Vantage retornou resposta vazia para ticker={}. Verifique se a API key e valida.", ticker);
                throw new IllegalArgumentException("Ticker '" + ticker + "' não encontrado no mercado US. Verifique se o ticker é válido e se a API key do Alpha Vantage está configurada.");
            } catch (IllegalArgumentException e) {
                throw e;
            } catch (Exception e) {
                log.error("Erro ao consultar Alpha Vantage para ticker={}: {} - {}", ticker, e.getClass().getSimpleName(), e.getMessage());
                throw new IllegalArgumentException("Erro ao consultar cotação US para '" + ticker + "': " + e.getMessage());
            }
        }
        throw new IllegalArgumentException("Mercado inválido: '" + mercado + "'. Valores aceitos: BR, US.");
    }
}
