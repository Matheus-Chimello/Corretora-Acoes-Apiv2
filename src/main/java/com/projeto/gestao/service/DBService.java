package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DBService {

    private final AutenticacaoService autenticacaoService;
    private final CarteiraService carteiraService;

    public DBService(
            AutenticacaoService autenticacaoService,
            CarteiraService carteiraService
    ) {
        this.autenticacaoService = autenticacaoService;
        this.carteiraService = carteiraService;
    }

    public void initDB() {
        try {
            Usuario administrador = autenticacaoService.garantirUsuarioPadrao(
                    "Administrador", "admin@corretora.local", "admin123", PapelUsuario.ADMIN
            );
            Usuario operador = autenticacaoService.garantirUsuarioPadrao(
                    "Operador", "usuario@corretora.local", "user123", PapelUsuario.USER
            );

            carteiraService.buscarCarteiraPrincipal(administrador);
            carteiraService.buscarCarteiraPrincipal(operador);
        } catch (Exception e) {
            System.err.println("Erro ao inicializar o banco de dados: " + e.getMessage());
        }
    }
}
