package com.projeto.gestao.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import java.util.UUID;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ControllerTest extends ApiIntegrationSupport {
    @Test
    void cadastraEListaAcoesDoUsuarioAutenticado() throws Exception {
        var acao = cadastrarAcao();
        mvc.perform(get("/acoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(acao.get("id").asText()))
                .andExpect(jsonPath("$[0].ticker").value("PETR4"));
    }

    @Test
    void buscaEAtualizaCotacoesSemExporAcaoInexistente() throws Exception {
        String id = cadastrarAcao().get("id").asText();
        mvc.perform(get("/acoes/{id}", id)).andExpect(status().isOk()).andExpect(jsonPath("$.ticker").value("PETR4"));
        mvc.perform(get("/acoes/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
        mvc.perform(get("/acoes/ticker/PETR4")).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/acoes/ticker/INEXISTENTE")).andExpect(status().isNotFound());
        quandoCotacao("15.00");
        mvc.perform(put("/acoes/{id}/atualizar-cotacao", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.cotacaoAtual").value(15));
        quandoCotacao("20.00");
        mvc.perform(put("/acoes/atualizar-cotacoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cotacaoAtual").value(20));
        mvc.perform(get("/acoes/{id}", id)).andExpect(jsonPath("$.cotacaoAtual").value(20));
    }

    @Test
    void cadastraListaEBuscaCorretoras() throws Exception {
        String id = body(mvc.perform(post("/corretoras").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cnpj\":\"02332886000104\"}")).andExpect(status().isCreated())
                .andExpect(jsonPath("$.razaoSocial").value("Corretora de teste"))).get("id").asText();
        mvc.perform(get("/corretoras")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cnpj", hasItem("02332886000104")));
        mvc.perform(get("/corretoras/{id}", id)).andExpect(status().isOk());
        mvc.perform(get("/corretoras/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
        mvc.perform(get("/corretoras/cnpj/02332886000104")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/corretoras/cnpj/0")).andExpect(status().isNotFound());
    }
}
