package com.projeto.gestao.api.exception;

import feign.FeignException;
import feign.Request;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void deveRetornarCamposInvalidos() {
        var result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "ticker", "Obrigatorio"));
        var erro = mock(MethodArgumentNotValidException.class);
        when(erro.getBindingResult()).thenReturn(result);
        var resposta = handler.handleValidation(erro);
        assertEquals(HttpStatus.BAD_REQUEST, resposta.getStatusCode());
        assertEquals(Map.of("ticker", "Obrigatorio"), resposta.getBody().get("fields"));
    }

    @Test
    void deveTraduzirErrosConhecidosSemExporDetalhesInternos() {
        var regra = handler.handleIllegalArgument(new IllegalArgumentException("Quantidade invalida"));
        assertEquals(HttpStatus.BAD_REQUEST, regra.getStatusCode());
        assertEquals("Quantidade invalida", regra.getBody().get("message"));
        assertFalse(regra.getBody().containsKey("fields"));
        var conflito = handler.handleIntegrity(new DataIntegrityViolationException("detalhes internos"));
        assertEquals(HttpStatus.CONFLICT, conflito.getStatusCode());
        assertEquals("O registro viola uma regra de unicidade ou integridade.", conflito.getBody().get("message"));
        var interno = handler.handleGeneral(new RuntimeException("dados internos"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, interno.getStatusCode());
        assertEquals("Ocorreu um erro interno no servidor.", interno.getBody().get("message"));
        assertEquals("Sem acesso", handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.FORBIDDEN, "Sem acesso")).getBody().get("message"));
        assertEquals("Erro na requisicao.", handler.handleResponseStatus(
                new ResponseStatusException(HttpStatus.BAD_REQUEST)).getBody().get("message"));
    }

    @ParameterizedTest
    @CsvSource({
            "404, Recurso nao encontrado na API externa.",
            "429, Limite de requisicoes da API externa excedido.",
            "401, Credencial invalida ou ausente para a API externa.",
            "403, Credencial invalida ou ausente para a API externa.",
            "500, Falha ao consultar a API externa."
    })
    void deveTraduzirErrosDeApiExterna(int status, String mensagem) {
        Request request = Request.create(Request.HttpMethod.GET, "https://example.invalid", Map.of(), null, StandardCharsets.UTF_8, null);
        FeignException erro = FeignException.errorStatus("consulta", feign.Response.builder()
                .status(status).reason("erro externo").request(request).build());
        var resposta = handler.handleFeign(erro);
        assertEquals(status, resposta.getStatusCode().value());
        assertEquals(mensagem, resposta.getBody().get("message"));
    }
}
