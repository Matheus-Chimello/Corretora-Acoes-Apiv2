package com.projeto.gestao.config;

import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CarteiraService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("dev")
public class AdminInitializer {
    private final AutenticacaoService autenticacao;
    private final CarteiraService carteiras;
    private final String email;
    private final String password;

    public AdminInitializer(AutenticacaoService autenticacao, CarteiraService carteiras,
                            @Value("${app.bootstrap.admin.username}") String email,
                            @Value("${app.bootstrap.admin.password}") String password) {
        this.autenticacao = autenticacao;
        this.carteiras = carteiras;
        this.email = email;
        this.password = password;
    }

    @PostConstruct
    public void criarAdministradorInicial() {
        var admin = autenticacao.garantirUsuarioPadrao("Administrador", email, password, PapelUsuario.ADMIN);
        carteiras.buscarCarteiraPrincipal(admin);
    }
}
