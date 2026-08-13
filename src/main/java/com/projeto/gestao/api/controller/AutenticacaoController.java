package com.projeto.gestao.api.controller;

import com.projeto.gestao.service.AutenticacaoService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AutenticacaoController {

    private final AutenticacaoService autenticacaoService;

    public AutenticacaoController(AutenticacaoService autenticacaoService) {
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping("/register")
    public ResponseEntity<AutenticacaoService.RespostaAutenticacao> registrar(@RequestBody Map<String, String> payload) {
        String senha = payload.get("password");
        String confirmarSenha = payload.get("confirmPassword");
        if (senha == null || !senha.equals(confirmarSenha)) {
            throw new IllegalArgumentException("As senhas não conferem.");
        }

        var usuario = autenticacaoService.registrar(payload.get("name"), payload.get("email"), senha);
        return ResponseEntity.status(HttpStatus.CREATED).body(autenticacaoService.resposta(usuario));
    }

    @PostMapping("/login")
    public ResponseEntity<AutenticacaoService.RespostaAutenticacao> login(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(autenticacaoService.login(payload.get("email"), payload.get("password")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao) {
        autenticacaoService.encerrarSessao(autorizacao);
        return ResponseEntity.noContent().build();
    }
}
