package com.projeto.gestao.api.exception;

import feign.FeignException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> campos = new LinkedHashMap<>();
        for (FieldError erro : exception.getBindingResult().getFieldErrors()) {
            campos.put(erro.getField(), erro.getDefaultMessage());
        }
        return resposta(HttpStatus.BAD_REQUEST, "Validation Error", "Dados da requisicao invalidos.", campos);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException exception) {
        return resposta(HttpStatus.BAD_REQUEST, "Business Rule Error", exception.getMessage(), null);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException exception) {
        HttpStatus status = HttpStatus.resolve(exception.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.BAD_REQUEST;
        }
        String mensagem = exception.getReason() == null ? "Erro na requisicao." : exception.getReason();
        return resposta(status, status.getReasonPhrase(), mensagem, null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleIntegrity(DataIntegrityViolationException exception) {
        return resposta(HttpStatus.CONFLICT, "Conflict", "O registro viola uma regra de unicidade ou integridade.", null);
    }

    @ExceptionHandler(FeignException.class)
    public ResponseEntity<Map<String, Object>> handleFeign(FeignException exception) {
        HttpStatus status = mapearStatusExterno(exception.status());
        String mensagem = switch (status) {
            case NOT_FOUND -> "Recurso nao encontrado na API externa.";
            case TOO_MANY_REQUESTS -> "Limite de requisicoes da API externa excedido.";
            case UNAUTHORIZED, FORBIDDEN -> "Credencial invalida ou ausente para a API externa.";
            default -> "Falha ao consultar a API externa.";
        };
        return resposta(status, "External API Error", mensagem, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception exception) {
        return resposta(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "Ocorreu um erro interno no servidor.", null);
    }

    private HttpStatus mapearStatusExterno(int status) {
        if (status >= 400 && status < 600) {
            HttpStatus resolvido = HttpStatus.resolve(status);
            if (resolvido != null) {
                return resolvido;
            }
        }
        return HttpStatus.BAD_GATEWAY;
    }

    private ResponseEntity<Map<String, Object>> resposta(
            HttpStatus status,
            String erro,
            String mensagem,
            Map<String, String> campos
    ) {
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("timestamp", LocalDateTime.now());
        corpo.put("status", status.value());
        corpo.put("error", erro);
        corpo.put("message", mensagem);
        if (campos != null && !campos.isEmpty()) {
            corpo.put("fields", campos);
        }
        return ResponseEntity.status(status).body(corpo);
    }
}
