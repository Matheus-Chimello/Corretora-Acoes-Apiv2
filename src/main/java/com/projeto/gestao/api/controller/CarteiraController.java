package com.projeto.gestao.api.controller;

import com.projeto.gestao.domain.dto.AporteRequest;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CarteiraService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/carteiras")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class CarteiraController {

    private final CarteiraService carteiraService;
    private final AutenticacaoService autenticacaoService;

    public CarteiraController(CarteiraService carteiraService, AutenticacaoService autenticacaoService) {
        this.carteiraService = carteiraService;
        this.autenticacaoService = autenticacaoService;
    }

    @GetMapping
    public ResponseEntity<List<Carteira>> listarCarteiras(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        return ResponseEntity.ok(carteiraService.listarTodas(usuarioAutenticado(autorizacao)));
    }

    @GetMapping("/principal")
    public ResponseEntity<Carteira> buscarCarteiraPrincipal(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        return ResponseEntity.ok(carteiraService.buscarCarteiraPrincipal(usuarioAutenticado(autorizacao)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Carteira> buscarPorId(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable Long id
    ) {
        return carteiraService.buscarPorId(usuarioAutenticado(autorizacao), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/principal/recalcular")
    public ResponseEntity<Carteira> recalcularSaldoAcao(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        autenticacaoService.exigirAdministrador(usuario);
        return ResponseEntity.ok(carteiraService.calcularSaldoAcao(usuario));
    }

    @PostMapping("/principal/aportes")
    public ResponseEntity<Carteira> realizarAporte(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @Valid @RequestBody AporteRequest payload
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        autenticacaoService.exigirInvestidor(usuario);
        return ResponseEntity.ok(carteiraService.realizarAporte(usuario, payload.valor()));
    }

    @PutMapping("/{id}/saldo-conta")
    public ResponseEntity<Carteira> atualizarSaldoEmConta(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao,
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        autenticacaoService.exigirAdministrador(usuario);
        return ResponseEntity.ok(carteiraService.atualizarSaldoEmConta(usuario, id, saldo(payload.get("saldoEmConta"))));
    }

    private Usuario usuarioAutenticado(String autorizacao) {
        return autenticacaoService.obterUsuarioAutenticado(autorizacao);
    }

    private BigDecimal saldo(Object valor) {
        try {
            if (valor == null || valor.toString().isBlank()) {
                throw new NumberFormatException("blank");
            }
            return new BigDecimal(valor.toString());
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Saldo em conta deve ser um número válido.");
        }
    }
}
