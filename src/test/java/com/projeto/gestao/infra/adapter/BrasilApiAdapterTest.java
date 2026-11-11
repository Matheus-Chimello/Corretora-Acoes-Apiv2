package com.projeto.gestao.infra.adapter;

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
    @DisplayName("Consulta indica participante do mercado para CNAE 6612-6")
    void deveRetornarTrueParaCnaeFinanceiro() {
        BrasilApiCnpjDto dto = buildDto(2, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        assertTrue(brasilApiAdapter.consultar("02332886000104").participanteMercado());
    }

    @Test
    @DisplayName("Consulta reconhece corretora pela razão social quando o CNAE está ausente")
    void deveRetornarTrueQuandoCnaeNuloMasRazaoSocialIndicaCorretora() {
        BrasilApiCnpjDto dto = buildDto(2, null, null);
        dto.setRazaoSocial("XP INVESTIMENTOS CORRETORA DE CAMBIO, TITULOS E VALORES MOBILIARIOS S/A");
        dto.setNomeFantasia("XP INVESTIMENTOS CCTVM S/A");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        assertTrue(brasilApiAdapter.consultar("02332886000104").participanteMercado());
    }

    @Test
    @DisplayName("Consulta retorna resultado negativo para atividade comercial")
    void deveRetornarFalseParaCnaeNaoFinanceiro() {
        BrasilApiCnpjDto dto = buildDto(2, 47211, "Comercio varejista");
        dto.setRazaoSocial("MERCADO EXEMPLO LTDA");
        dto.setNomeFantasia("Mercado Exemplo");
        when(brasilApiClient.consultarCnpj("12345678000195")).thenReturn(dto);

        assertFalse(brasilApiAdapter.consultar("12345678000195").participanteMercado());
    }

    @Test
    @DisplayName("Consulta retorna resultado negativo para situação cadastral inativa")
    void deveRetornarFalseParaSituacaoInativa() {
        BrasilApiCnpjDto dto = buildDto(4, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("12345678000195")).thenReturn(dto);

        assertFalse(brasilApiAdapter.consultar("12345678000195").participanteMercado());
    }

    @Test
    @DisplayName("Consulta propaga a falha da fonte de CNPJ")
    void devePropagarFalhaDaApi() {
        when(brasilApiClient.consultarCnpj("00000000000000")).thenThrow(new RuntimeException("Timeout"));

        assertEquals("Timeout", assertThrows(RuntimeException.class,
                () -> brasilApiAdapter.consultar("00000000000000")).getMessage());
    }

    @Test
    @DisplayName("Consulta retorna os dados cadastrais e identifica a fonte")
    void deveRetornarCnpjInfoMapeadaCorretamente() {
        BrasilApiCnpjDto dto = buildDto(2, 66126, "Corretoras de Titulos");
        when(brasilApiClient.consultarCnpj("02332886000104")).thenReturn(dto);

        var consulta = brasilApiAdapter.consultar("02332886000104");
        var info = consulta.dados();

        assertNotNull(info);
        assertEquals("BrasilAPI", consulta.fonte());
        assertEquals("XP INVESTIMENTOS CCTVM SA", info.razaoSocial());
        assertEquals("XP Investimentos", info.nomeFantasia());
        assertEquals("SP", info.uf());
        assertEquals("ATIVA", info.situacaoCadastral());
    }

    @Test
    @DisplayName("Consulta retorna null quando a fonte não retorna dados")
    void deveRetornarNullQuandoApiRetornaNull() {
        when(brasilApiClient.consultarCnpj("99999999999999")).thenReturn(null);

        assertNull(brasilApiAdapter.consultar("99999999999999"));
    }
}
