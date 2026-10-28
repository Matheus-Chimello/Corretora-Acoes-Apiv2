package com.projeto.gestao.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CarteiraEAutenticacaoControllerTest extends ApiIntegrationSupport {
    @Test
    void alteraSaldoApenasComNumeroValido() throws Exception {
        long id = carteiraPrincipal().get("id").asLong();
        mvc.perform(put("/carteiras/{id}/saldo-conta", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"saldoEmConta\":\"100.50\"}")).andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(100.50));
        for (String payload : new String[]{"{}", "{\"saldoEmConta\":\" \"}", "{\"saldoEmConta\":\"abc\"}"}) {
            mvc.perform(put("/carteiras/{id}/saldo-conta", id).contentType(MediaType.APPLICATION_JSON).content(payload))
                    .andExpect(status().isBadRequest());
        }
        mvc.perform(get("/carteiras/{id}", id)).andExpect(jsonPath("$.saldoEmConta").value(100.50));
    }

    @Test
    void buscaCarteiraSomenteParaUsuarioAutenticado() throws Exception {
        long id = carteiraPrincipal().get("id").asLong();
        mvc.perform(get("/carteiras/{id}", id)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/carteiras/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound());
    }

    @Test
    void exigeConfirmacaoDeSenhaNoRegistro() throws Exception {
        for (String payload : new String[]{"{\"confirmPassword\":\"x\"}", "{\"password\":\"x\",\"confirmPassword\":\"y\"}"}) {
            mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isBadRequest());
        }
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Nova pessoa\",\"email\":\"nova@teste.local\",\"password\":\"senha-teste\",\"confirmPassword\":\"senha-teste\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("nova@teste.local"));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"nova@teste.local\",\"password\":\"senha-teste\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"));
    }

    @Test
    void loginELogoutPreservamContratoStateless() throws Exception {
        String token = body(mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"http@teste.local\",\"password\":\"senha-teste\"}"))
                .andExpect(status().isOk())).get("token").asText();
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("http@teste.local"));
        mvc.perform(post("/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
    }
}
