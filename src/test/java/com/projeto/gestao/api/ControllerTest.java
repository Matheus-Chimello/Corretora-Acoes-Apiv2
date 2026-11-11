package com.projeto.gestao.api;

import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.repository.CorretoraRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ControllerTest extends ApiIntegrationSupport {
    @Autowired private CorretoraRepository corretoraRepository;

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
                .andExpect(jsonPath("$.razaoSocial").value("Corretora de teste"))
                .andExpect(jsonPath("$.fonteValidacao").value("BrasilAPI"))
                .andExpect(jsonPath("$.ultimaValidacaoEm").isNotEmpty())).get("id").asText();
        mvc.perform(get("/corretoras")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cnpj", hasItem("02332886000104")));
        mvc.perform(get("/corretoras/{id}", id)).andExpect(status().isOk());
        mvc.perform(get("/corretoras/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
        mvc.perform(get("/corretoras/cnpj/02332886000104")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get("/corretoras/cnpj/0")).andExpect(status().isNotFound());
    }

    @Test
    void listaTodasParaAdminESomenteValidadasParaUsuario() throws Exception {
        String cnpjValidado = "12345678000195";
        String cnpjNaoValidado = "02332886000104";
        String cnpjSemValidacao = "11444777000161";
        inserirCorretoraLegada(cnpjNaoValidado, false);
        inserirCorretoraLegada(cnpjSemValidacao, null);
        String token = tokenUsuarioComum();

        int totalAdmin = body(mvc.perform(get("/corretoras")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cnpj", hasItems(cnpjValidado, cnpjNaoValidado, cnpjSemValidacao)))
                .andExpect(jsonPath("$[?(@.cnpj == '%s')].validadaNaCvm".formatted(cnpjNaoValidado), hasItem(false))))
                .size();
        int totalUsuario = body(consultarComoUsuario("/corretoras", token).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cnpj", hasItem(cnpjValidado)))
                .andExpect(jsonPath("$[*].cnpj", not(hasItem(cnpjNaoValidado))))
                .andExpect(jsonPath("$[*].cnpj", not(hasItem(cnpjSemValidacao))))
                .andExpect(jsonPath("$[*].validadaNaCvm", everyItem(is(true)))))
                .size();

        mvc.perform(get("/api/dashboard/corretoras")).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(totalAdmin)))
                .andExpect(jsonPath("$[*].cnpj", hasItems(cnpjValidado, cnpjNaoValidado, cnpjSemValidacao)));
        consultarComoUsuario("/api/dashboard/corretoras", token).andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(totalUsuario)))
                .andExpect(jsonPath("$[*].cnpj", hasItem(cnpjValidado)))
                .andExpect(jsonPath("$[*].validadaNaCvm", everyItem(is(true))));
        consultarComoUsuario("/api/dashboard/stats", token).andExpect(status().isOk())
                .andExpect(jsonPath("$.corretorasCount").value(totalUsuario));
    }

    @Test
    void adminRevalidaCorretoraEAtualizaSuaVisibilidadeNoCatalogo() throws Exception {
        String cnpj = "02332886000104";
        var cadastro = body(mvc.perform(post("/corretoras").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cnpj\":\"%s\"}".formatted(cnpj))).andExpect(status().isCreated()));
        String id = cadastro.get("id").asText();
        String token = tokenUsuarioComum();
        String rota = "/corretoras/" + id + "/revalidar";
        var dadosValidados = new ValidacaoCnpjPort.CnpjInfo("Corretora de teste", "Teste", "Corretora de valores",
                "01001000", "contato@teste.local", "11999999999", "Rua de teste", "1", "", "Centro", "Sao Paulo", "SP", "ATIVA");
        var dadosInativos = new ValidacaoCnpjPort.CnpjInfo("Corretora de teste", "Teste", "Corretora de valores",
                "01001000", "contato@teste.local", "11999999999", "Rua de teste", "1", "", "Centro", "Sao Paulo", "SP", "BAIXADA");

        mvc.perform(post(rota).with(anonymous())).andExpect(status().isUnauthorized());
        mvc.perform(post(rota).with(anonymous()).header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
        mvc.perform(post("/corretoras/{id}/revalidar", UUID.randomUUID())).andExpect(status().isNotFound());
        consultarComoUsuario("/api/dashboard/corretoras", token).andExpect(jsonPath("$[*].cnpj", hasItem(cnpj)));

        when(cnpjs.consultar(cnpj)).thenReturn(new ValidacaoCnpjPort.ConsultaCnpj(dadosInativos, false, "BrasilAPI"));
        var revalidada = body(mvc.perform(post(rota)).andExpect(status().isOk())
                .andExpect(jsonPath("$.validadaNaCvm").value(false))
                .andExpect(jsonPath("$.situacaoCadastral").value("BAIXADA"))
                .andExpect(jsonPath("$.fonteValidacao").value("BrasilAPI"))
                .andExpect(jsonPath("$.ultimaValidacaoEm").isNotEmpty()));
        String ultimaValidacao = revalidada.get("ultimaValidacaoEm").asText();
        assertThat(Instant.parse(ultimaValidacao)).isBeforeOrEqualTo(Instant.now());
        consultarComoUsuario("/api/dashboard/corretoras", token).andExpect(jsonPath("$[*].cnpj", not(hasItem(cnpj))));
        mvc.perform(get("/corretoras")).andExpect(jsonPath("$[*].cnpj", hasItem(cnpj)));

        when(cnpjs.consultar(cnpj)).thenReturn(null);
        mvc.perform(post(rota)).andExpect(status().isBadGateway());
        mvc.perform(get("/corretoras/{id}", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.validadaNaCvm").value(false))
                .andExpect(jsonPath("$.fonteValidacao").value("BrasilAPI"))
                .andExpect(jsonPath("$.ultimaValidacaoEm").value(ultimaValidacao));

        when(cnpjs.consultar(cnpj)).thenReturn(new ValidacaoCnpjPort.ConsultaCnpj(dadosValidados, true, "BrasilAPI"));
        mvc.perform(post(rota)).andExpect(status().isOk())
                .andExpect(jsonPath("$.validadaNaCvm").value(true));
        consultarComoUsuario("/api/dashboard/corretoras", token).andExpect(jsonPath("$[*].cnpj", hasItem(cnpj)));
    }

    private void inserirCorretoraLegada(String cnpj, Boolean validadaNaCvm) {
        Corretora corretora = new Corretora();
        corretora.setCnpj(cnpj);
        corretora.setRazaoSocial("Corretora legada de teste");
        corretora.setValidadaNaCvm(validadaNaCvm);
        corretoraRepository.save(corretora);
    }

    private String tokenUsuarioComum() throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":"Usuario de teste","email":"consulta@teste.local","password":"senha-teste","papel":"USER"}
                """)).andExpect(status().isCreated());
        return body(mvc.perform(post("/auth/login").with(anonymous()).contentType(MediaType.APPLICATION_JSON).content("""
                {"email":"consulta@teste.local","password":"senha-teste"}
                """)).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("USER"))).get("token").asText();
    }

    private ResultActions consultarComoUsuario(String rota, String token) throws Exception {
        return mvc.perform(get(rota).with(anonymous()).header("Authorization", "Bearer " + token));
    }
}
