package com.projeto.gestao.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "corretoras")
public class Corretora {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String cnpj;

    private String razaoSocial;
    private String nomeFantasia;
    private String email;
    private String telefone;

    private String cep;
    private String logradouro;
    private String numero;
    private String complemento;
    private String bairro;
    private String cidade;
    private String uf;

    private String situacaoCadastral;
    private Boolean validadaNaCvm;
    private LocalDateTime ultimaValidacaoEm;
    private String fonteValidacao;
    
    private LocalDateTime dataCadastro;

    public Corretora() {
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getCnpj() { return cnpj; }
    public void setCnpj(String cnpj) { this.cnpj = cnpj; }

    public String getRazaoSocial() { return razaoSocial; }
    public void setRazaoSocial(String razaoSocial) { this.razaoSocial = razaoSocial; }

    public String getNomeFantasia() { return nomeFantasia; }
    public void setNomeFantasia(String nomeFantasia) { this.nomeFantasia = nomeFantasia; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getLogradouro() { return logradouro; }
    public void setLogradouro(String logradouro) { this.logradouro = logradouro; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getComplemento() { return complemento; }
    public void setComplemento(String complemento) { this.complemento = complemento; }

    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }

    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }

    public String getUf() { return uf; }
    public void setUf(String uf) { this.uf = uf; }

    public String getSituacaoCadastral() { return situacaoCadastral; }
    public void setSituacaoCadastral(String situacaoCadastral) { this.situacaoCadastral = situacaoCadastral; }

    public Boolean getValidadaNaCvm() { return validadaNaCvm; }
    public void setValidadaNaCvm(Boolean validadaNaCvm) { this.validadaNaCvm = validadaNaCvm; }

    public Instant getUltimaValidacaoEm() {
        return ultimaValidacaoEm == null ? null : ultimaValidacaoEm.toInstant(ZoneOffset.UTC);
    }
    public String getFonteValidacao() { return fonteValidacao; }

    public void registrarValidacao(boolean validada, String fonte, Instant instante) {
        this.validadaNaCvm = validada;
        this.fonteValidacao = fonte;
        this.ultimaValidacaoEm = LocalDateTime.ofInstant(instante, ZoneOffset.UTC);
    }

    public LocalDateTime getDataCadastro() { return dataCadastro; }
    public void setDataCadastro(LocalDateTime dataCadastro) { this.dataCadastro = dataCadastro; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Corretora corretora = (Corretora) o;
        return Objects.equals(id, corretora.id) && Objects.equals(cnpj, corretora.cnpj);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, cnpj);
    }
}
