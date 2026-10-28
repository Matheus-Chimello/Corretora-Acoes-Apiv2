package com.projeto.gestao.config;

import com.projeto.gestao.api.ApiIntegrationSupport;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CarteiraService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AdminInitializerTest extends ApiIntegrationSupport {
    @Autowired AutenticacaoService auth;
    @Autowired CarteiraService carteiras;

    @Test
    void deveCriarAdminComSenhaDoAmbienteSemRegravarContaExistente() throws Exception {
        new AdminInitializer(auth, carteiras, "admin@teste.local", "senha-inicial-teste").criarAdministradorInicial();
        String token = body(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@teste.local\",\"password\":\"senha-inicial-teste\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("ADMIN"))).get("token").asText();
        mvc.perform(get("/carteiras/principal").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.saldoEmConta").value(0));
        new AdminInitializer(auth, carteiras, "admin@teste.local", "outra-senha-teste").criarAdministradorInicial();
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@teste.local\",\"password\":\"senha-inicial-teste\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@teste.local\",\"password\":\"outra-senha-teste\"}"))
                .andExpect(status().isUnauthorized());
    }
}
