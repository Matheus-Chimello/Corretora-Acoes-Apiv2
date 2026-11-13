package com.projeto.gestao.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "historico_administrativo")
public class RegistroAdministrativo {
    public enum Acao {
        ALTERACAO_PERFIL,
        INATIVACAO_CONTA,
        REVALIDACAO_CORRETORA
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @Column(nullable = false)
    private String autor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Acao acao;

    @Column(nullable = false, length = 512)
    private String alvo;

    @Column(nullable = false)
    private String resultado;

    protected RegistroAdministrativo() {
    }

    public RegistroAdministrativo(String autor, Acao acao, String alvo, String resultado) {
        this.dataHora = LocalDateTime.now(ZoneOffset.UTC);
        this.autor = autor;
        this.acao = acao;
        this.alvo = alvo;
        this.resultado = resultado;
    }

    public Long getId() { return id; }
    public Instant getDataHora() { return dataHora.toInstant(ZoneOffset.UTC); }
    public String getAutor() { return autor; }
    public Acao getAcao() { return acao; }
    public String getAlvo() { return alvo; }
    public String getResultado() { return resultado; }
}
