package com.projeto.gestao.infra.adapter;

import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.infra.client.BrasilApiClient;
import com.projeto.gestao.infra.client.dto.BrasilApiCnpjDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BrasilApiAdapterTest {

    @Mock
    private BrasilApiClient brasilApiClient;

    @InjectMocks
    private BrasilApiAdapter brasilApiAdapter;

    private BrasilApiCnpjDto buildDto(int situacao, Integer cnaeCodigo, String cnaeDescricao) {
        BrasilApiCnpjDto dto = new BrasilApiCnpjDto();
        dto.setSituacaoCadastral(situacao);
        dto.setRazaoSocial("XP INVESTIMENTOS CCTVM SA");
        dto.setNomeFantasia("XP Investimentos");
        dto.setDescricaoSituacaoCadastral("ATIVA");
        dto.setCep("04538133");
        dto.setEmail("contato@xpi.com.br");
        dto.setDdd_telefone_1("1134769600");
        dto.setLogradouro("Av. Brigadeiro Faria Lima");
        dto.setNumero("201");
        dto.setComplemento("6o andar");
        dto.setBairro("Itaim Bibi");
        dto.setMunicipio("Sao Paulo");
        dto.setUf("SP");
        if (cnaeCodigo != null) {
            BrasilApiCnpjDto.CnaePrincipal cnae = new BrasilApiCnpjDto.CnaePrincipal();
            cnae.setCodigo(cnaeCodigo);
            cnae.setDescricao(cnaeDescricao);
            dto.setCnae_principal(cnae);
        }
        return dto;
    }

    @Test
    @DisplayName("isValidAndMarketParticipant deve retornar true para CNAE 6612-6")
    void deveRetornarTrueParaCnaeFinanceiro() {
        BrasilApiCnpjDto dto = buildDto(2, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        assertTrue(brasilApiAdapter.isValidAndMarketParticipant("02332886000104"));
    }

    @Test
    @DisplayName("isValidAndMarketParticipant deve retornar true quando CNAE vem nulo mas razao social indica corretora")
    void deveRetornarTrueQuandoCnaeNuloMasRazaoSocialIndicaCorretora() {
        BrasilApiCnpjDto dto = buildDto(2, null, null);
        dto.setRazaoSocial("XP INVESTIMENTOS CORRETORA DE CAMBIO, TITULOS E VALORES MOBILIARIOS S/A");
        dto.setNomeFantasia("XP INVESTIMENTOS CCTVM S/A");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        assertTrue(brasilApiAdapter.isValidAndMarketParticipant("02332886000104"));
    }

    @Test
    @DisplayName("isValidAndMarketParticipant deve retornar false para CNAE nao financeiro")
    void deveRetornarFalseParaCnaeNaoFinanceiro() {
        BrasilApiCnpjDto dto = buildDto(2, 47211, "Comercio varejista");
        dto.setRazaoSocial("MERCADO EXEMPLO LTDA");
        dto.setNomeFantasia("Mercado Exemplo");
        when(brasilApiClient.consultarCnpj("12345678000195")).thenReturn(dto);

        assertFalse(brasilApiAdapter.isValidAndMarketParticipant("12345678000195"));
    }

    @Test
    @DisplayName("isValidAndMarketParticipant deve retornar false quando situacao nao e ATIVA")
    void deveRetornarFalseParaSituacaoInativa() {
        BrasilApiCnpjDto dto = buildDto(4, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("12345678000195")).thenReturn(dto);

        assertFalse(brasilApiAdapter.isValidAndMarketParticipant("12345678000195"));
    }

    @Test
    @DisplayName("isValidAndMarketParticipant deve retornar false quando API lanca excecao")
    void deveRetornarFalseQuandoApiFalha() {
        when(brasilApiClient.consultarCnpj("00000000000000")).thenThrow(new RuntimeException("Timeout"));

        assertFalse(brasilApiAdapter.isValidAndMarketParticipant("00000000000000"));
    }

    @Test
    @DisplayName("getCnpjInfo deve retornar CnpjInfo mapeada corretamente")
    void deveRetornarCnpjInfoMapeadaCorretamente() {
        BrasilApiCnpjDto dto = buildDto(2, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        ValidacaoCnpjPort.CnpjInfo info = brasilApiAdapter.getCnpjInfo("02332886000104");

        assertNotNull(info);
        assertEquals("XP INVESTIMENTOS CCTVM SA", info.razaoSocial());
        assertEquals("XP Investimentos", info.nomeFantasia());
        assertEquals("SP", info.uf());
        assertEquals("ATIVA", info.situacaoCadastral());
    }

    @Test
    @DisplayName("getCnpjInfo deve retornar null quando API retorna null")
    void deveRetornarNullQuandoApiRetornaNull() {
        when(brasilApiClient.consultarCnpj("99999999999999")).thenReturn(null);

        assertNull(brasilApiAdapter.getCnpjInfo("99999999999999"));
    }
}
