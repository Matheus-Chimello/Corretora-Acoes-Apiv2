package com.projeto.gestao.api;

import com.projeto.gestao.api.controller.AcaoController;
import com.projeto.gestao.api.controller.CorretoraController;
import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.service.AcaoService;
import com.projeto.gestao.service.AutenticacaoService;
import com.projeto.gestao.service.CorretoraService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ControllerTest {
    private final AcaoService acoes = mock(AcaoService.class);
    private final CorretoraService corretoras = mock(CorretoraService.class);
    private final AutenticacaoService autenticacao = mock(AutenticacaoService.class);
    private final Usuario usuario = new Usuario();
    private final UUID id = UUID.randomUUID();
    private MockMvc mvc;
    private Acao acao;
    private Corretora corretora;

    @BeforeEach
    void configurar() {
        when(autenticacao.obterUsuarioAutenticado("Bearer token")).thenReturn(usuario);
        acao = new Acao();
        acao.setId(id);
        acao.setTicker("PETR4");
        acao.setMercado("BR");
        acao.setMoeda("BRL");
        acao.setCotacaoAtual(BigDecimal.TEN);
        corretora = new Corretora();
        corretora.setId(id);
        corretora.setCnpj("12345678000100");
        corretora.setRazaoSocial("Corretora A");
        mvc = MockMvcBuilders.standaloneSetup(new AcaoController(acoes, autenticacao), new CorretoraController(corretoras, autenticacao)).build();
    }

    @Test
    void cadastraEListaAcoesDoUsuarioAutenticado() throws Exception {
        when(acoes.cadastrarAcao(usuario, "PETR4", "BR")).thenReturn(acao);
        when(acoes.listarTodas(usuario)).thenReturn(List.of(acao));
        mvc.perform(post("/acoes").header("Authorization", "Bearer token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ticker\":\"PETR4\",\"mercado\":\"BR\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.ticker").value("PETR4"));
        mvc.perform(get("/acoes").header("Authorization", "Bearer token"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].ticker").value("PETR4"));
        verify(acoes).listarTodas(usuario);
    }

    @Test
    void buscaEAtualizaCotacoesSemExporAcaoInexistente() throws Exception {
        when(acoes.buscarPorId(usuario, id)).thenReturn(Optional.of(acao)).thenReturn(Optional.empty());
        when(acoes.buscarPorTicker(usuario, "PETR4")).thenReturn(Optional.of(acao));
        when(acoes.atualizarCotacao(usuario, id)).thenReturn(acao);
        when(acoes.atualizarCotacoesDoCatalogo(usuario)).thenReturn(List.of(acao));
        mvc.perform(get("/acoes/{id}", id).header("Authorization", "Bearer token")).andExpect(status().isOk());
        mvc.perform(get("/acoes/{id}", id).header("Authorization", "Bearer token")).andExpect(status().isNotFound());
        mvc.perform(get("/acoes/ticker/PETR4").header("Authorization", "Bearer token")).andExpect(jsonPath("$.ticker").value("PETR4"));
        mvc.perform(get("/acoes/ticker/INEXISTENTE").header("Authorization", "Bearer token")).andExpect(status().isNotFound());
        mvc.perform(put("/acoes/{id}/atualizar-cotacao", id).header("Authorization", "Bearer token")).andExpect(status().isOk());
        mvc.perform(put("/acoes/atualizar-cotacoes").header("Authorization", "Bearer token")).andExpect(jsonPath("$[0].ticker").value("PETR4"));
    }

    @Test
    void cadastraListaEBuscaCorretoras() throws Exception {
        when(corretoras.cadastrarCorretora("12345678000100")).thenReturn(corretora);
        when(corretoras.listarTodas()).thenReturn(List.of(corretora));
        when(corretoras.buscarPorId(id)).thenReturn(Optional.of(corretora)).thenReturn(Optional.empty());
        when(corretoras.buscarPorCnpj("12345678000100")).thenReturn(Optional.of(corretora));
        mvc.perform(post("/corretoras").header("Authorization", "Bearer token").contentType(MediaType.APPLICATION_JSON)
                .content("{\"cnpj\":\"12345678000100\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.razaoSocial").value("Corretora A"));
        mvc.perform(get("/corretoras").header("Authorization", "Bearer token")).andExpect(jsonPath("$[0].cnpj").value("12345678000100"));
        mvc.perform(get("/corretoras/{id}", id).header("Authorization", "Bearer token")).andExpect(status().isOk());
        mvc.perform(get("/corretoras/{id}", id).header("Authorization", "Bearer token")).andExpect(status().isNotFound());
        mvc.perform(get("/corretoras/cnpj/12345678000100").header("Authorization", "Bearer token")).andExpect(status().isOk());
        mvc.perform(get("/corretoras/cnpj/0").header("Authorization", "Bearer token")).andExpect(status().isNotFound());
    }
}
