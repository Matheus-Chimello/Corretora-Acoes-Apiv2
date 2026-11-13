package com.projeto.gestao.api.controller;

import com.projeto.gestao.service.HistoricoAdministrativoService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/historico")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8082", "http://127.0.0.1:8082"})
@PreAuthorize("hasRole('ADMIN')")
public class HistoricoAdministrativoController {
    private final HistoricoAdministrativoService historico;

    public HistoricoAdministrativoController(HistoricoAdministrativoService historico) {
        this.historico = historico;
    }

    @GetMapping
    public HistoricoAdministrativoService.Pagina listar(@RequestParam(defaultValue = "0") int pagina) {
        return historico.listar(pagina);
    }
}
