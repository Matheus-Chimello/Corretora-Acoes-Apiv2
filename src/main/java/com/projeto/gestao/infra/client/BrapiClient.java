package com.projeto.gestao.infra.client;

import com.projeto.gestao.infra.client.dto.BrapiResponseDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "brapiClient", url = "https://brapi.dev/api/quote")
public interface BrapiClient {

    @GetMapping("/{ticker}")
    BrapiResponseDto consultarCotacao(
            @PathVariable("ticker") String ticker,
            @RequestHeader("Authorization") String authorization
    );
}
