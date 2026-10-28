package com.projeto.gestao.api.controller;

import com.projeto.gestao.service.AutenticacaoService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8082", "http://127.0.0.1:8082"})
public class AutenticacaoController {

    private final AutenticacaoService autenticacaoService;

    public AutenticacaoController(AutenticacaoService autenticacaoService) {
        this.autenticacaoService = autenticacaoService;
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
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
    public ResponseEntity<AutenticacaoService.RespostaAutenticacao> login(@Valid @RequestBody LoginRequest payload) {
        return ResponseEntity.ok(autenticacaoService.login(payload.email(), payload.password()));
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        return Map.of("username", authentication.getName(), "authorities", authentication.getAuthorities()
                .stream().map(GrantedAuthority::getAuthority).toList());
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) { }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao) {
        autenticacaoService.encerrarSessao(autorizacao);
        return ResponseEntity.noContent().build();
    }
}
