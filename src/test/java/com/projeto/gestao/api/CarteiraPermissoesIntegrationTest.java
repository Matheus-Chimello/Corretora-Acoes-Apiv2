package com.projeto.gestao.api;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CarteiraPermissoesIntegrationTest extends ApiIntegrationSupport {
    private static final String CORRETORA_JSON = "{\"cnpj\":\"02332886000104\"}";
    private static final String ACAO_JSON = "{\"ticker\":\"PETR4\",\"mercado\":\"BR\"}";

    @Test
    void userCadastraEConsultaAtivoEmSeuCatalogo() throws Exception {
        String token = criarConta("cliente@teste.local", "USER");
        String id = body(escrever(token, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        consultar(token, "/acoes").andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(id)).andExpect(jsonPath("$[0].ticker").value("PETR4"));
    }

    @Test
    void cadastroDeAtivoEAporteExigemLogin() throws Exception {
        mvc.perform(post("/acoes").with(anonymous()).contentType(MediaType.APPLICATION_JSON).content(ACAO_JSON))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/carteiras/principal/aportes").with(anonymous()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"valor\":100}")).andExpect(status().isUnauthorized());
    }

    @Test
    void aportesComprasEVendasRespeitamOMesmoSaldoPorMoeda() throws Exception {
        String token = criarConta("cliente@teste.local", "USER");
        String outraConta = criarConta("outra@teste.local", "USER");
        String corretora = cadastrarCorretora(CORRETORA_JSON);
        String acaoBr = body(escrever(token, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        String acaoUs = body(escrever(token, "/acoes", "{\"ticker\":\"AAPL\",\"mercado\":\"US\"}")
                .andExpect(status().isCreated())).get("id").asText();
        String rotaAporte = "/carteiras/principal/aportes";
        String compraUsd = "/carteiras/principal/acoes/" + acaoUs + "/compras";
        String compra = "{\"corretoraId\":\"%s\",\"quantidade\":2,\"valorUnitario\":30}".formatted(corretora);

        escrever(token, rotaAporte, "{\"valor\":200}").andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(200));
        escrever(token, compraUsd, compra).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Saldo em USD insuficiente para esta compra."));
        escrever(token, rotaAporte, "{\"valor\":10,\"moeda\":\"EUR\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.moeda").isNotEmpty());

        escrever(token, rotaAporte, "{\"valor\":100,\"moeda\":\"USD\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(200))
                .andExpect(jsonPath("$.saldoEmDolar").value(100));
        String posicao = body(escrever(token, compraUsd, compra).andExpect(status().isOk())).get("posicaoId").asText();
        consultar(token, "/carteiras/principal").andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(200))
                .andExpect(jsonPath("$.saldoEmDolar").value(40));

        escrever(token, "/carteiras/principal/posicoes/" + posicao + "/vendas", "{\"quantidade\":1,\"valorUnitario\":35}")
                .andExpect(status().isOk());
        escrever(token, "/carteiras/principal/acoes/" + acaoBr + "/compras", compra).andExpect(status().isOk());
        consultar(token, "/carteiras/principal").andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(140))
                .andExpect(jsonPath("$.saldoEmDolar").value(75));
        consultar(token, "/carteiras/principal/transacoes").andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.tipo == 'APORTE')].moeda", containsInAnyOrder("BRL", "USD")))
                .andExpect(jsonPath("$[?(@.tipo == 'COMPRA')].moeda", containsInAnyOrder("BRL", "USD")))
                .andExpect(jsonPath("$[?(@.tipo == 'VENDA')].moeda", containsInAnyOrder("USD")));
        consultar(outraConta, "/carteiras/principal").andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoEmConta").value(0))
                .andExpect(jsonPath("$.saldoEmDolar").value(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ADMIN"})
    void titularConsegueOperarPropriaCarteiraDoCadastroAoHistorico(String papel) throws Exception {
        String token = criarConta("cliente@teste.local", papel);
        String origem = cadastrarCorretora(CORRETORA_JSON);
        String destino = body(consultar(token, "/corretoras/cnpj/12345678000195").andExpect(status().isOk())).get("id").asText();
        String acao = body(escrever(token, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        escrever(token, "/carteiras/principal/aportes", "{\"valor\":0}").andExpect(status().isBadRequest());
        escrever(token, "/carteiras/principal/aportes", "{\"valor\":200}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.saldoEmConta").value(200));
        String posicao = body(escrever(token, "/carteiras/principal/acoes/" + acao + "/compras", """
                {"corretoraId":"%s","quantidade":3,"valorUnitario":30}
                """.formatted(origem)).andExpect(status().isOk())
                .andExpect(jsonPath("$.quantidadeTotal").value(3))).get("posicaoId").asText();
        escrever(token, "/carteiras/principal/posicoes/" + posicao + "/transferencias", """
                {"corretoraDestinoId":"%s","quantidade":1}
                """.formatted(destino)).andExpect(status().isOk())
                .andExpect(jsonPath("$.corretoraRelacionada.id").value(destino));
        escrever(token, "/carteiras/principal/posicoes/" + posicao + "/vendas", "{\"quantidade\":1,\"valorUnitario\":35}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantidadeTotal").value(1));
        consultar(token, "/carteiras/principal").andExpect(status().isOk()).andExpect(jsonPath("$.saldoEmConta").value(145));
        consultar(token, "/carteiras/principal/posicoes").andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        consultar(token, "/carteiras/principal/transacoes").andExpect(status().isOk())
                .andExpect(jsonPath("$[*].tipo", containsInAnyOrder("APORTE", "COMPRA", "TRANSFERENCIA_SAIDA", "TRANSFERENCIA_ENTRADA", "VENDA")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ADMIN"})
    void operacoesDeUmaContaNaoAlteramCarteiraNemAtivosDeOutra(String papel) throws Exception {
        String titular = criarConta("titular@teste.local", "USER");
        String outraConta = criarConta("outra@teste.local", papel);
        String corretora = cadastrarCorretora(CORRETORA_JSON);
        String destino = body(consultar(titular, "/corretoras/cnpj/12345678000195").andExpect(status().isOk())).get("id").asText();
        String acao = body(escrever(titular, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        escrever(titular, "/carteiras/principal/aportes", "{\"valor\":200}").andExpect(status().isOk());
        String compra = "{\"corretoraId\":\"%s\",\"quantidade\":2,\"valorUnitario\":30}".formatted(corretora);
        String rotaCompra = "/carteiras/principal/acoes/" + acao + "/compras";
        String posicao = body(escrever(titular, rotaCompra, compra).andExpect(status().isOk())).get("posicaoId").asText();
        long carteira = body(consultar(titular, "/carteiras/principal").andExpect(status().isOk())).get("id").asLong();
        escrever(outraConta, "/carteiras/principal/aportes", "{\"valor\":150}").andExpect(status().isOk());

        consultar(outraConta, "/carteiras/" + carteira).andExpect(status().isNotFound());
        consultar(outraConta, "/acoes/" + acao).andExpect(status().isNotFound());
        escrever(outraConta, rotaCompra, compra).andExpect(status().isBadRequest());
        escrever(outraConta, "/carteiras/principal/posicoes/" + posicao + "/vendas", "{\"quantidade\":1,\"valorUnitario\":35}")
                .andExpect(status().isBadRequest());
        escrever(outraConta, "/carteiras/principal/posicoes/" + posicao + "/transferencias",
                "{\"corretoraDestinoId\":\"%s\",\"quantidade\":1}".formatted(destino)).andExpect(status().isBadRequest());

        consultar(titular, "/carteiras/principal").andExpect(jsonPath("$.saldoEmConta").value(140));
        consultar(titular, "/carteiras/principal/posicoes").andExpect(jsonPath("$[0].quantidadeTotal").value(2));
        consultar(titular, "/carteiras/principal/transacoes").andExpect(jsonPath("$[*].tipo", containsInAnyOrder("APORTE", "COMPRA")));
        consultar(outraConta, "/carteiras/principal").andExpect(jsonPath("$.saldoEmConta").value(150));
        consultar(outraConta, "/carteiras/principal/posicoes").andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void userSincronizaCotacoesDoCatalogoEPosicoesDaPropriaConta() throws Exception {
        String token = criarConta("cliente@teste.local", "USER");
        String outra = criarConta("outra@teste.local", "ADMIN");
        String corretora = cadastrarCorretora(CORRETORA_JSON);
        String acao = body(escrever(token, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        String acaoAlheia = body(escrever(outra, "/acoes", ACAO_JSON).andExpect(status().isCreated())).get("id").asText();
        escrever(token, "/carteiras/principal/aportes", "{\"valor\":200}").andExpect(status().isOk());
        escrever(token, "/carteiras/principal/acoes/" + acao + "/compras",
                "{\"corretoraId\":\"%s\",\"quantidade\":2,\"valorUnitario\":30}".formatted(corretora)).andExpect(status().isOk());

        quandoCotacao("35.00");
        sincronizar(token, "/acoes/atualizar-cotacoes").andExpect(status().isOk()).andExpect(jsonPath("$[0].cotacaoAtual").value(35));
        quandoCotacao("40.00");
        sincronizar(token, "/acoes/" + acao + "/atualizar-cotacao").andExpect(status().isOk()).andExpect(jsonPath("$.cotacaoAtual").value(40));
        quandoCotacao("45.00");
        sincronizar(token, "/carteiras/principal/atualizar-cotacoes").andExpect(status().isOk()).andExpect(jsonPath("$[0].cotacaoAtual").value(45));
        consultar(token, "/carteiras/principal").andExpect(jsonPath("$.saldoAcao").value(90));
        sincronizar(token, "/acoes/" + acaoAlheia + "/atualizar-cotacao").andExpect(status().isBadRequest());
        consultar(outra, "/acoes/" + acaoAlheia).andExpect(jsonPath("$.cotacaoAtual").value(30));
    }

    private String criarConta(String email, String papel) throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON).content("""
                {"nome":"Pessoa de teste","email":"%s","password":"senha-teste","papel":"%s"}
                """.formatted(email, papel))).andExpect(status().isCreated());
        return body(mvc.perform(post("/auth/login").with(anonymous()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"senha-teste"}
                        """.formatted(email))).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value(papel))).get("token").asText();
    }

    private String cadastrarCorretora(String json) throws Exception {
        return body(mvc.perform(post("/corretoras").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated())).get("id").asText();
    }

    private ResultActions escrever(String token, String rota, String json) throws Exception {
        return mvc.perform(post(rota).with(anonymous()).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private ResultActions consultar(String token, String rota) throws Exception {
        return mvc.perform(get(rota).with(anonymous()).header("Authorization", "Bearer " + token));
    }

    private ResultActions sincronizar(String token, String rota) throws Exception {
        return mvc.perform(put(rota).with(anonymous()).header("Authorization", "Bearer " + token));
    }
}
