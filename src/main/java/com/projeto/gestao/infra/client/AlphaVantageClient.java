package com.projeto.gestao.infra.client;

import com.projeto.gestao.infra.client.dto.AlphaVantageResponseDto;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AlphaVantageClient {

    private final RestClient restClient;

    public AlphaVantageClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl("https://www.alphavantage.co")
                .build();
    }

    public AlphaVantageResponseDto consultarCotacao(String function, String symbol, String apikey) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/query")
                        .queryParam("function", function)
                        .queryParam("symbol", symbol)
                        .queryParam("apikey", apikey)
                        .build())
                .retrieve()
                .body(AlphaVantageResponseDto.class);
    }
}
