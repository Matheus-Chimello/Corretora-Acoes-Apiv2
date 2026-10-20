package com.projeto.gestao.infra.adapter;

import com.projeto.gestao.infra.client.ViaCepClient;
import com.projeto.gestao.infra.client.dto.ViaCepDto;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ViaCepAdapterTest {
    private final ViaCepClient client = mock(ViaCepClient.class);
    private final ViaCepAdapter adapter = new ViaCepAdapter(client);

    @Test
    void retornaEnderecoQuandoCepExiste() {
        ViaCepDto dto = new ViaCepDto();
        dto.setCep("01001-000");
        dto.setLogradouro("Praca da Se");
        dto.setComplemento("lado impar");
        dto.setBairro("Se");
        dto.setLocalidade("Sao Paulo");
        dto.setUf("SP");
        when(client.consultarCep("01001000")).thenReturn(dto);

        var resultado = adapter.getCepInfo("01001000");
        assertNotNull(resultado);
        assertEquals("01001-000", resultado.cep());
        assertEquals("Praca da Se", resultado.logradouro());
        assertEquals("SP", resultado.uf());
    }

    @Test
    void retornaNuloQuandoCepNaoExisteOuRespostaVazia() {
        ViaCepDto dto = new ViaCepDto();
        dto.setErro(true);
        when(client.consultarCep("inexistente")).thenReturn(dto);
        when(client.consultarCep("vazio")).thenReturn(null);
        assertNull(adapter.getCepInfo("inexistente"));
        assertNull(adapter.getCepInfo("vazio"));
    }

    @Test
    void retornaNuloQuandoServicoEstaIndisponivel() {
        when(client.consultarCep("01001000")).thenThrow(new RuntimeException("indisponivel"));
        assertNull(adapter.getCepInfo("01001000"));
    }
}
