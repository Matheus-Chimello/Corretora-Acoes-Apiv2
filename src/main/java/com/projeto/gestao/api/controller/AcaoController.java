package com.projeto.gestao.api.controller;

import com.projeto.gestao.domain.dto.AcaoRequest;
import com.projeto.gestao.domain.dto.AcaoResponse;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.service.AcaoService;
import com.projeto.gestao.service.AutenticacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/acoes")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8082", "http://127.0.0.1:8082"})
public class AcaoController {

    private final AcaoService acaoService;
    private final AutenticacaoService autenticacaoService;

    public AcaoController(
            AcaoService acaoService,
            AutenticacaoService autenticacaoService
    ) {
        this.acaoService = acaoService;
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping
    public ResponseEntity<AcaoResponse> cadastrarAcao(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @Valid @RequestBody AcaoRequest payload
    ) {
        usuarioAutenticado(autorizacao);
        var acao = acaoService.cadastrarAcao(payload.ticker(), payload.mercado());
        return ResponseEntity.status(HttpStatus.CREATED).body(AcaoResponse.from(acao));
    }

    @GetMapping
    public ResponseEntity<List<AcaoResponse>> listarAcoes(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        usuarioAutenticado(autorizacao);
        return ResponseEntity.ok(acaoService.listarTodas().stream().map(AcaoResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AcaoResponse> buscarPorId(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable UUID id
    ) {
        usuarioAutenticado(autorizacao);
        return acaoService.buscarPorId(id)
                .map(acao -> ResponseEntity.ok(AcaoResponse.from(acao)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/ticker/{ticker}")
    public ResponseEntity<AcaoResponse> buscarPorTicker(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable String ticker
    ) {
        usuarioAutenticado(autorizacao);
        return acaoService.buscarPorTicker(ticker)
                .map(acao -> ResponseEntity.ok(AcaoResponse.from(acao)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/atualizar-cotacao")
    public ResponseEntity<AcaoResponse> atualizarCotacao(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable UUID id
    ) {
        usuarioAutenticado(autorizacao);
        return ResponseEntity.ok(AcaoResponse.from(acaoService.atualizarCotacao(id)));
    }

    private Usuario usuarioAutenticado(String autorizacao) {
        return autenticacaoService.obterUsuarioAutenticado(autorizacao);
    }

}
