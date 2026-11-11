package com.projeto.gestao.service;

import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.ArrayList;

@Service
public class MercadoService {
    private static final Logger log = LoggerFactory.getLogger(MercadoService.class);
    private final CotacaoAcaoPort cotacoes;

    public MercadoService(CotacaoAcaoPort cotacoes) { this.cotacoes = cotacoes; }

    public List<CotacaoPublica> consultarCotacoes() {
        List<CotacaoPublica> disponiveis = new ArrayList<>();
        for (String ticker : List.of("PETR4", "VALE3", "ITUB4", "MGLU3")) {
            try {
                var cotacao = cotacoes.getCotacao(ticker, "BR");
                if (cotacao != null && cotacao.cotacaoAtual() != null) {
                    disponiveis.add(new CotacaoPublica(ticker, cotacao.moeda(), cotacao.cotacaoAtual(),
                            LocalDateTime.now(ZoneId.of("America/Sao_Paulo"))));
                }
            } catch (RuntimeException exception) {
                log.warn("Cotacao de mercado indisponivel para {}", ticker);
            }
        }
        if (disponiveis.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Cotações de mercado temporariamente indisponíveis.");
        }
        return List.copyOf(disponiveis);
    }

    public record CotacaoPublica(String ticker, String moeda, BigDecimal cotacaoAtual, LocalDateTime dataHoraCotacao) { }
}
