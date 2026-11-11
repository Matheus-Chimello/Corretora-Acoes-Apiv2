package com.projeto.gestao.domain.port;

public interface ValidacaoCnpjPort {
    ConsultaCnpj consultar(String cnpj);

    record ConsultaCnpj(CnpjInfo dados, boolean participanteMercado, String fonte) {}

    record CnpjInfo(String razaoSocial, String nomeFantasia, String cnaePrincipalDescricao, String cep, String email, String telefone, String logradouro, String numero, String complemento, String bairro, String municipio, String uf, String situacaoCadastral) {}
}
