package com.projeto.gestao.domain.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Objects;

@Entity
public class Carteira {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private BigDecimal saldoAcao =  BigDecimal.ZERO;

    private BigDecimal saldoEmConta = BigDecimal.ZERO;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal saldoEmDolar = BigDecimal.ZERO;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    public Carteira() {
    }

    public Carteira(Long id, BigDecimal saldoAcao, BigDecimal saldoEmConta) {
        this.id = id;
        this.saldoAcao = saldoAcao;
        this.saldoEmConta = saldoEmConta;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getSaldoAcao() {
        return saldoAcao;
    }

    public void setSaldoAcao(BigDecimal saldoAcao) {
        this.saldoAcao = saldoAcao;
    }

    public BigDecimal getSaldoEmConta() {
        return saldoEmConta;
    }

    public void setSaldoEmConta(BigDecimal saldoEmConta) {
        this.saldoEmConta = saldoEmConta;
    }

    public BigDecimal getSaldoEmDolar() {
        return saldoEmDolar;
    }

    public BigDecimal saldoNaMoeda(Moeda moeda) {
        BigDecimal saldo = moeda == Moeda.USD ? saldoEmDolar : saldoEmConta;
        return saldo == null ? BigDecimal.ZERO : saldo;
    }

    public void atualizarSaldoNaMoeda(Moeda moeda, BigDecimal saldo) {
        if (moeda == Moeda.USD) {
            this.saldoEmDolar = saldo;
        } else {
            setSaldoEmConta(saldo);
        }
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public void setUsuario(Usuario usuario) {
        this.usuario = usuario;
    }

    @Override
    public boolean equals(Object o) {
        if (o == null || getClass() != o.getClass()) return false;
        Carteira carteira = (Carteira) o;
        return Objects.equals(saldoAcao, carteira.saldoAcao)
                && Objects.equals(saldoEmConta, carteira.saldoEmConta)
                && Objects.equals(saldoEmDolar, carteira.saldoEmDolar);
    }

    @Override
    public int hashCode() {
        return Objects.hash(saldoAcao, saldoEmConta, saldoEmDolar);
    }
}
