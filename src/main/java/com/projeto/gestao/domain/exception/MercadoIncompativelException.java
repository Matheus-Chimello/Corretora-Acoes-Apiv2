package com.projeto.gestao.domain.exception;

public final class MercadoIncompativelException extends IllegalArgumentException {
    private final String mercadoSugerido;

    public MercadoIncompativelException(String mensagem, String mercadoSugerido) {
        super(mensagem);
        this.mercadoSugerido = mercadoSugerido;
    }

    public String mercadoSugerido() {
        return mercadoSugerido;
    }
}
