package com.projeto.gestao.domain.model;

public enum Moeda {
    BRL,
    USD;

    public static Moeda daCotacao(String moeda) {
        return "USD".equalsIgnoreCase(moeda) ? USD : BRL;
    }
}
