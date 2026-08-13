package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.port.BuscaCepPort;
import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.repository.CorretoraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class CorretoraService {

    private final CorretoraRepository corretoraRepository;
    private final ValidacaoCnpjPort validacaoCnpjPort;
    private final BuscaCepPort buscaCepPort;

    public CorretoraService(CorretoraRepository corretoraRepository, ValidacaoCnpjPort validacaoCnpjPort, BuscaCepPort buscaCepPort) {
        this.corretoraRepository = corretoraRepository;
        this.validacaoCnpjPort = validacaoCnpjPort;
        this.buscaCepPort = buscaCepPort;
    }

    @Transactional
    public Corretora cadastrarCorretora(String cnpj) {
        String cnpjLimpo = cnpj == null ? "" : cnpj.replaceAll("[^0-9]", "");

        if (!cnpjValido(cnpjLimpo)) {
            throw new IllegalArgumentException("CNPJ invalido. Informe um CNPJ com 14 digitos e verificadores validos.");
        }
        
        if (corretoraRepository.existsByCnpj(cnpjLimpo)) {
            throw new IllegalArgumentException("Corretora com este CNPJ já existe.");
        }

        ValidacaoCnpjPort.CnpjInfo cnpjInfo = validacaoCnpjPort.getCnpjInfo(cnpjLimpo);
        if (cnpjInfo == null) {
            throw new IllegalArgumentException("Não foi possível obter dados para este CNPJ na Brasil API.");
        }

        boolean validadaCvm = validacaoCnpjPort.isValidAndMarketParticipant(cnpjLimpo)
                || cnpjInfoIndicaParticipanteMercado(cnpjInfo);

        Corretora corretora = new Corretora();
        corretora.setCnpj(cnpjLimpo);
        corretora.setRazaoSocial(cnpjInfo.razaoSocial());
        corretora.setNomeFantasia(cnpjInfo.nomeFantasia());
        corretora.setEmail(cnpjInfo.email());
        corretora.setTelefone(cnpjInfo.telefone());
        corretora.setSituacaoCadastral(cnpjInfo.situacaoCadastral());
        corretora.setValidadaNaCvm(validadaCvm);
        corretora.setDataCadastro(LocalDateTime.now());

        if (cnpjInfo.cep() == null || cnpjInfo.cep().isBlank()) {
            throw new IllegalArgumentException("O CNPJ consultado nao possui CEP para validacao.");
        }

        BuscaCepPort.CepInfo cepInfo = buscaCepPort.getCepInfo(cnpjInfo.cep().replaceAll("[^0-9]", ""));
        if (cepInfo == null) {
            throw new IllegalArgumentException("Nao foi possivel validar o CEP informado pela fonte publica.");
        }

        corretora.setCep(cepInfo.cep());
        corretora.setLogradouro(cepInfo.logradouro());
        corretora.setBairro(cepInfo.bairro());
        corretora.setCidade(cepInfo.localidade());
        corretora.setUf(cepInfo.uf());
        corretora.setComplemento(cepInfo.complemento());

        return corretoraRepository.save(corretora);
    }

    private boolean cnpjValido(String cnpj) {
        if (cnpj == null || !cnpj.matches("\\d{14}") || cnpj.chars().distinct().count() == 1) {
            return false;
        }

        int primeiroDigito = calcularDigitoCnpj(cnpj.substring(0, 12));
        int segundoDigito = calcularDigitoCnpj(cnpj.substring(0, 12) + primeiroDigito);
        return cnpj.charAt(12) - '0' == primeiroDigito && cnpj.charAt(13) - '0' == segundoDigito;
    }

    private int calcularDigitoCnpj(String base) {
        int[] pesos = base.length() == 12
                ? new int[]{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
                : new int[]{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int indice = 0; indice < base.length(); indice++) {
            soma += (base.charAt(indice) - '0') * pesos[indice];
        }
        int resto = soma % 11;
        return resto < 2 ? 0 : 11 - resto;
    }

    public List<Corretora> listarTodas() {
        return corretoraRepository.findAll();
    }

    public Optional<Corretora> buscarPorId(UUID id) {
        return corretoraRepository.findById(id);
    }

    public Optional<Corretora> buscarPorCnpj(String cnpj) {
        return corretoraRepository.findByCnpj(cnpj.replaceAll("[^0-9]", ""));
    }

    private boolean cnpjInfoIndicaParticipanteMercado(ValidacaoCnpjPort.CnpjInfo cnpjInfo) {
        if (!"ATIVA".equalsIgnoreCase(cnpjInfo.situacaoCadastral())) {
            return false;
        }

        String texto = normalize(String.join(" ",
                safe(cnpjInfo.razaoSocial()),
                safe(cnpjInfo.nomeFantasia()),
                safe(cnpjInfo.cnaePrincipalDescricao())
        ));

        return texto.contains("CORRETORA")
                || texto.contains("DISTRIBUIDORA DE TITULOS")
                || texto.contains("TITULOS E VALORES MOBILIARIOS")
                || texto.contains("CCTVM")
                || texto.contains("DTVM")
                || texto.contains("BANCO");
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase(Locale.ROOT);
    }
}
