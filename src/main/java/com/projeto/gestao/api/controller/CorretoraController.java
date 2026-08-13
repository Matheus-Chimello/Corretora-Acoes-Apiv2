package com.projeto.gestao.api.controller;

import com.projeto.gestao.domain.dto.CorretoraRequest;
import com.projeto.gestao.domain.dto.CorretoraResponse;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CorretoraService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/corretoras")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class CorretoraController {

    private final CorretoraService corretoraService;
    private final AutenticacaoService autenticacaoService;

    public CorretoraController(CorretoraService corretoraService, AutenticacaoService autenticacaoService) {
        this.corretoraService = corretoraService;
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping
    public ResponseEntity<CorretoraResponse> cadastrarCorretora(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @Valid @RequestBody CorretoraRequest payload
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        autenticacaoService.exigirAdministrador(usuario);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(CorretoraResponse.from(corretoraService.cadastrarCorretora(payload.cnpj())));
    }

    @GetMapping
    public ResponseEntity<List<CorretoraResponse>> listarCorretoras(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        usuarioAutenticado(autorizacao);
        return ResponseEntity.ok(corretoraService.listarTodas().stream().map(CorretoraResponse::from).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CorretoraResponse> buscarPorId(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable UUID id
    ) {
        usuarioAutenticado(autorizacao);
        return corretoraService.buscarPorId(id)
                .map(corretora -> ResponseEntity.ok(CorretoraResponse.from(corretora)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/cnpj/{cnpj}")
    public ResponseEntity<CorretoraResponse> buscarPorCnpj(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable String cnpj
    ) {
        usuarioAutenticado(autorizacao);
        return corretoraService.buscarPorCnpj(cnpj)
                .map(corretora -> ResponseEntity.ok(CorretoraResponse.from(corretora)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Usuario usuarioAutenticado(String autorizacao) {
        return autenticacaoService.obterUsuarioAutenticado(autorizacao);
    }
}
