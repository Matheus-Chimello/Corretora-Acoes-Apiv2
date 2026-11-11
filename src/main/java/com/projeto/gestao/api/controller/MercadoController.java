package com.projeto.gestao.api.controller;

import com.projeto.gestao.service.MercadoService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Duration;
import java.util.List;

@RestController
@RequestMapping("/api/mercado")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8082", "http://127.0.0.1:8082"})
public class MercadoController {
    private final MercadoService mercado;

    public MercadoController(MercadoService mercado) { this.mercado = mercado; }

    @GetMapping("/cotacoes")
    public ResponseEntity<List<MercadoService.CotacaoPublica>> cotacoes() {
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofSeconds(30)).cachePublic())
                .body(mercado.consultarCotacoes());
    }
}
