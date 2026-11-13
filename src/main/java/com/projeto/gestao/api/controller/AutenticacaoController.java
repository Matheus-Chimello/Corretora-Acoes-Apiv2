package com.projeto.gestao.api.controller;

import com.projeto.gestao.domain.dto.AlterarMinhaSenhaRequest;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CotacoesLoginService;
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
import org.springframework.web.bind.annotation.PutMapping;
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
    private final CotacoesLoginService cotacoes;

    public AutenticacaoController(AutenticacaoService autenticacaoService, CotacoesLoginService cotacoes) {
        this.autenticacaoService = autenticacaoService;
        this.cotacoes = cotacoes;
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
        var resposta = autenticacaoService.login(payload.email(), payload.password());
        return ResponseEntity.ok(resposta.comCotacoesAtualizadas(cotacoes.atualizar(resposta.email())));
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        return Map.of("username", authentication.getName(), "authorities", authentication.getAuthorities()
                .stream().map(GrantedAuthority::getAuthority).toList());
    }

    @PutMapping("/me/senha")
    public ResponseEntity<Void> alterarMinhaSenha(Authentication authentication,
                                                   @Valid @RequestBody AlterarMinhaSenhaRequest payload) {
        autenticacaoService.alterarMinhaSenha(authentication.getName(), payload.senhaAtual(), payload.novaSenha());
        return ResponseEntity.noContent().build();
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) { }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao) {
        autenticacaoService.encerrarSessao(autorizacao);
        return ResponseEntity.noContent().build();
    }
}
