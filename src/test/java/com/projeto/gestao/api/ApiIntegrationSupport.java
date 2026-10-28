package com.projeto.gestao.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.projeto.gestao.domain.port.BuscaCepPort;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.Map;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@WithMockUser(username = "http@teste.local", roles = "ADMIN")
public abstract class ApiIntegrationSupport {
    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper mapper;
    @MockBean protected CotacaoAcaoPort cotacoes;
    @MockBean protected ValidacaoCnpjPort cnpjs;
    @MockBean protected BuscaCepPort ceps;

    @BeforeEach
    void prepararContaEFontesExternas() throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(
                Map.of("nome", "Pessoa HTTP", "email", "http@teste.local", "password", "senha-teste", "papel", "ADMIN"))))
                .andExpect(status().isCreated());
        quandoCotacao("30.00");
        when(cnpjs.getCnpjInfo(anyString())).thenReturn(new ValidacaoCnpjPort.CnpjInfo(
                "Corretora de teste", "Teste", "Corretora de valores", "01001000", "contato@teste.local", "11999999999",
                "Rua de teste", "1", "", "Centro", "Sao Paulo", "SP", "ATIVA"));
        when(cnpjs.isValidAndMarketParticipant(anyString())).thenReturn(true);
        when(ceps.getCepInfo(anyString())).thenReturn(new BuscaCepPort.CepInfo(
                "01001000", "Rua de teste", "", "Centro", "Sao Paulo", "SP"));
    }

    protected void quandoCotacao(String valor) {
        when(cotacoes.getCotacao(anyString(), anyString())).thenAnswer(invocation -> new CotacaoAcaoPort.CotacaoInfo(
                invocation.getArgument(0), "Empresa de teste", "BR".equals(invocation.getArgument(1)) ? "BRL" : "USD", new BigDecimal(valor)));
    }

    protected JsonNode body(ResultActions result) throws Exception {
        return mapper.readTree(result.andReturn().getResponse().getContentAsString());
    }

    protected JsonNode cadastrarAcao() throws Exception {
        return body(mvc.perform(post("/acoes").contentType(MediaType.APPLICATION_JSON)
                .content("{\"ticker\":\"PETR4\",\"mercado\":\"BR\"}")).andExpect(status().isCreated()));
    }

    protected JsonNode carteiraPrincipal() throws Exception {
        return body(mvc.perform(get("/carteiras/principal")).andExpect(status().isOk()));
    }
}
