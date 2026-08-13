package com.projeto.gestao.controller;

import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.domain.dto.PosicaoAcaoResponse;
import com.projeto.gestao.service.AcaoService;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CarteiraService;
import com.projeto.gestao.service.CorretoraService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class DashboardController {

    private final CorretoraService corretoraService;
    private final AcaoService acaoService;
    private final CarteiraService carteiraService;
    private final AutenticacaoService autenticacaoService;

    public DashboardController(
            CorretoraService corretoraService,
            AcaoService acaoService,
            CarteiraService carteiraService,
            AutenticacaoService autenticacaoService
    ) {
        this.corretoraService = corretoraService;
        this.acaoService = acaoService;
        this.carteiraService = carteiraService;
        this.autenticacaoService = autenticacaoService;
    }

    @GetMapping("/stats")
    public Map<String, Object> getStats(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        var carteira = carteiraService.buscarCarteiraPrincipal(usuario);
        Map<String, Object> stats = new HashMap<>();
        stats.put("corretorasCount", corretoraService.listarTodas().size());
        stats.put("acoesCount", carteiraService.listarPosicoes(usuario).size());
        stats.put("carteirasCount", carteiraService.listarTodas(usuario).size());
        stats.put("saldoAcao", carteira.getSaldoAcao());
        stats.put("saldoEmConta", carteira.getSaldoEmConta());
        return stats;
    }

    @GetMapping("/corretoras")
    public List<?> listarCorretoras(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        usuarioAutenticado(autorizacao);
        return corretoraService.listarTodas();
    }

    @GetMapping("/acoes")
    public Map<String, Object> listarAcoesComCarteira(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        Usuario usuario = usuarioAutenticado(autorizacao);
        Map<String, Object> response = new HashMap<>();
        response.put("acoes", carteiraService.listarPosicoes(usuario).stream().map(PosicaoAcaoResponse::from).toList());
        response.put("carteiras", carteiraService.listarTodas(usuario));
        return response;
    }

    @GetMapping("/carteiras")
    public List<?> listarCarteiras(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String autorizacao
    ) {
        return carteiraService.listarTodas(usuarioAutenticado(autorizacao));
    }

    private Usuario usuarioAutenticado(String autorizacao) {
        return autenticacaoService.obterUsuarioAutenticado(autorizacao);
    }
}
