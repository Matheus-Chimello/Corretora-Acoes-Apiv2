package com.projeto.gestao.api;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import java.util.Map;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.anyString;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:mercado_login;MODE=PostgreSQL;DB_CLOSE_DELAY=0")
class MercadoELoginIntegrationTest extends ApiIntegrationSupport {
    @Test
    void deveConsultarCotacoesPublicasSemLoginNemDadosDeContas() throws Exception {
        cadastrarAcao();
        mvc.perform(get("/api/mercado/cotacoes").with(anonymous()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[*].ticker", containsInAnyOrder("PETR4", "VALE3", "ITUB4", "MGLU3")))
                .andExpect(jsonPath("$[0].cotacaoAtual").value(30))
                .andExpect(jsonPath("$[0].dataHoraCotacao").isNotEmpty())
                .andExpect(jsonPath("$[*].usuario").isEmpty())
                .andExpect(jsonPath("$[*].id").isEmpty());
        mvc.perform(get("/acoes").with(anonymous())).andExpect(status().isUnauthorized());
    }

    @Test
    void deveManterIndicadoresDisponiveisSeUmaFonteFalharESinalizarIndisponibilidadeTotal() throws Exception {
        when(cotacoes.getCotacao("PETR4", "BR")).thenThrow(new IllegalArgumentException("Fonte indisponivel"));
        when(cotacoes.getCotacao("VALE3", "BR")).thenReturn(new CotacaoAcaoPort.CotacaoInfo("VALE3", "Vale", "BRL", null));
        mvc.perform(get("/api/mercado/cotacoes").with(anonymous()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        when(cotacoes.getCotacao(anyString(), anyString())).thenReturn(null);
        mvc.perform(get("/api/mercado/cotacoes").with(anonymous()))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void loginUserDeveAtualizarTodoCatalogoDaContaSemAlterarCatalogosDeOutrosUsuarios() throws Exception {
        cadastrarAcao();
        mvc.perform(post("/acoes").contentType(MediaType.APPLICATION_JSON).content("{\"ticker\":\"IBM\",\"mercado\":\"US\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(
                "{\"nome\":\"Outra pessoa\",\"email\":\"outra@teste.local\",\"password\":\"senha-teste\",\"papel\":\"USER\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/acoes").with(user("outra@teste.local").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON).content("{\"ticker\":\"MSFT\",\"mercado\":\"US\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":"Administrador de teste","email":"reserva@teste.local","password":"senha-teste","papel":"ADMIN"}
                """)).andExpect(status().isCreated());
        var conta = body(mvc.perform(get("/api/usuarios")).andExpect(status().isOk()));
        var id = java.util.stream.StreamSupport.stream(conta.spliterator(), false)
                .filter(item -> item.get("email").asText().equals("http@teste.local"))
                .findFirst().orElseThrow().get("id").asText();
        mvc.perform(put("/api/usuarios/{id}", id).contentType(MediaType.APPLICATION_JSON).content(
                "{\"nome\":\"Pessoa HTTP\",\"email\":\"http@teste.local\",\"papel\":\"USER\",\"ativo\":true}"))
                .andExpect(status().isOk());
        quandoCotacao("45.00");
        mvc.perform(post("/auth/login").with(anonymous()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"http@teste.local\",\"password\":\"senha-incorreta\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/acoes")).andExpect(status().isOk())
                .andExpect(jsonPath("$[*].cotacaoAtual", everyItem(is(30.0))));
        var login = body(mvc.perform(post("/auth/login").with(anonymous()).contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", "http@teste.local", "password", "senha-teste")))).andExpect(status().isOk())
                .andExpect(jsonPath("$.cotacoesAtualizadas").value(true)));
        org.assertj.core.api.Assertions.assertThat(login.get("role").asText()).isEqualTo("USER");
        var atualizado = body(mvc.perform(get("/acoes").header("Authorization", "Bearer " + login.get("token").asText()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)));
        org.assertj.core.api.Assertions.assertThat(atualizado.findValues("cotacaoAtual"))
                .allSatisfy(valor -> org.assertj.core.api.Assertions.assertThat(valor.decimalValue()).isEqualByComparingTo("45"));
        mvc.perform(get("/acoes").with(user("outra@teste.local").roles("USER")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].cotacaoAtual").value(30));
        mvc.perform(post("/corretoras").header("Authorization", "Bearer " + login.get("token").asText())
                .contentType(MediaType.APPLICATION_JSON).content("{\"cnpj\":\"02332886000104\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DirtiesContext
    void falhaEmUmaCotacaoNaoDeveImpedirLoginNemDesfazerAsOutrasAtualizacoes() throws Exception {
        cadastrarAcao();
        mvc.perform(post("/acoes").contentType(MediaType.APPLICATION_JSON).content("{\"ticker\":\"IBM\",\"mercado\":\"US\"}"))
                .andExpect(status().isCreated());
        quandoCotacao("45.00");
        when(cotacoes.getCotacao("PETR4", "BR")).thenThrow(new IllegalArgumentException("Fonte indisponivel"));
        var login = body(mvc.perform(post("/auth/login").with(anonymous()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"http@teste.local\",\"password\":\"senha-teste\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.cotacoesAtualizadas").value(false)));
        mvc.perform(get("/acoes").header("Authorization", "Bearer " + login.get("token").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.ticker == 'PETR4')].cotacaoAtual", contains(30.0)))
                .andExpect(jsonPath("$[?(@.ticker == 'IBM')].cotacaoAtual", contains(45.0)));
    }
}
