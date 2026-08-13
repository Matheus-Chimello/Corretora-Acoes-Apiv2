package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Corretora;

import java.time.LocalDateTime;
import java.util.UUID;

public record CorretoraResponse(
        UUID id,
        String cnpj,
        String razaoSocial,
        String nomeFantasia,
        String email,
        String telefone,
        String cep,
        String logradouro,
        String numero,
        String complemento,
        String bairro,
        String cidade,
        String uf,
        String situacaoCadastral,
        Boolean validadaNaCvm,
        LocalDateTime dataCadastro
) {
    public static CorretoraResponse from(Corretora corretora) {
        return new CorretoraResponse(
                corretora.getId(),
                corretora.getCnpj(),
                corretora.getRazaoSocial(),
                corretora.getNomeFantasia(),
                corretora.getEmail(),
                corretora.getTelefone(),
                corretora.getCep(),
                corretora.getLogradouro(),
                corretora.getNumero(),
                corretora.getComplemento(),
                corretora.getBairro(),
                corretora.getCidade(),
                corretora.getUf(),
                corretora.getSituacaoCadastral(),
                corretora.getValidadaNaCvm(),
                corretora.getDataCadastro()
        );
    }
}
