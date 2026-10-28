package com.projeto.gestao.api.controller;

import com.projeto.gestao.domain.dto.UsuarioCreateRequest;
import com.projeto.gestao.domain.dto.UsuarioResponse;
import com.projeto.gestao.domain.dto.UsuarioUpdateRequest;
import com.projeto.gestao.domain.dto.AlterarSenhaRequest;
import com.projeto.gestao.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8082", "http://127.0.0.1:8082"})
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {
    private final UsuarioService usuarios;

    public UsuarioController(UsuarioService usuarios) { this.usuarios = usuarios; }

    @GetMapping
    public ResponseEntity<List<UsuarioResponse>> findAll() { return ResponseEntity.ok(usuarios.findAll()); }

    @GetMapping("/{id}")
    public ResponseEntity<UsuarioResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(usuarios.findById(id));
    }

    @PostMapping
    public ResponseEntity<UsuarioResponse> create(@Valid @RequestBody UsuarioCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(usuarios.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponse> update(@PathVariable UUID id, @Valid @RequestBody UsuarioUpdateRequest request) {
        return ResponseEntity.ok(usuarios.update(id, request));
    }

    @PutMapping("/{id}/senha")
    public ResponseEntity<Void> alterarSenha(@PathVariable UUID id, @Valid @RequestBody AlterarSenhaRequest request) {
        usuarios.alterarSenha(id, request);
        return ResponseEntity.noContent().build();
    }
}
