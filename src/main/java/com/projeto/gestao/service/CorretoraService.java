package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.port.BuscaCepPort;
import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.repository.CorretoraRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import static com.projeto.gestao.domain.model.RegistroAdministrativo.Acao.REVALIDACAO_CORRETORA;

@Service
public class CorretoraService {

    private final CorretoraRepository corretoraRepository;
    private final ValidacaoCnpjPort validacaoCnpjPort;
    private final BuscaCepPort buscaCepPort;
    private final HistoricoAdministrativoService historico;

    public CorretoraService(CorretoraRepository corretoraRepository, ValidacaoCnpjPort validacaoCnpjPort,
                            BuscaCepPort buscaCepPort, HistoricoAdministrativoService historico) {
        this.corretoraRepository = corretoraRepository;
        this.validacaoCnpjPort = validacaoCnpjPort;
        this.buscaCepPort = buscaCepPort;
        this.historico = historico;
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

        var consulta = validacaoCnpjPort.consultar(cnpjLimpo);
        if (consulta == null) {
            throw new IllegalArgumentException("Não foi possível obter dados para este CNPJ na Brasil API.");
        }

        if (!validadaNaConsulta(consulta)) {
            throw new IllegalArgumentException("O CNPJ informado nao foi validado como corretora ou participante do mercado.");
        }

        var cnpjInfo = consulta.dados();
        Corretora corretora = new Corretora();
        corretora.setCnpj(cnpjLimpo);
        corretora.setRazaoSocial(cnpjInfo.razaoSocial());
        corretora.setNomeFantasia(cnpjInfo.nomeFantasia());
        corretora.setEmail(cnpjInfo.email());
        corretora.setTelefone(cnpjInfo.telefone());
        corretora.setSituacaoCadastral(cnpjInfo.situacaoCadastral());
        corretora.registrarValidacao(true, consulta.fonte(), Instant.now());
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

    @Transactional
    public ResultadoRevalidacao revalidarCorretora(String autor, UUID id) {
        var corretora = corretoraRepository.findByIdParaAtualizar(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Corretora não encontrada."));
        String alvo = corretora.getRazaoSocial() == null ? corretora.getCnpj()
                : corretora.getRazaoSocial() + " (" + corretora.getCnpj() + ")";
        ValidacaoCnpjPort.ConsultaCnpj consulta;
        try {
            consulta = validacaoCnpjPort.consultar(corretora.getCnpj());
            if (consulta == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "A consulta de CNPJ não retornou dados para revalidação.");
            }
        } catch (RuntimeException falha) {
            historico.registrar(autor, REVALIDACAO_CORRETORA, alvo, "Falha na consulta");
            return new ResultadoRevalidacao(null, falha);
        }
        boolean validada = validadaNaConsulta(consulta);
        corretora.registrarValidacao(validada, consulta.fonte(), Instant.now());
        corretora.setSituacaoCadastral(consulta.dados().situacaoCadastral());
        historico.registrar(autor, REVALIDACAO_CORRETORA, alvo, validada ? "Validada" : "Não validada");
        return new ResultadoRevalidacao(corretoraRepository.save(corretora), null);
    }

    public record ResultadoRevalidacao(Corretora corretora, RuntimeException falha) {
        public Corretora obterResultado() {
            // A consulta malsucedida também entra no histórico antes da resposta HTTP.
            if (falha != null) throw falha;
            return corretora;
        }
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

    public List<Corretora> listarVisiveis(boolean administrador) {
        return administrador ? corretoraRepository.findAll() : corretoraRepository.findAllByValidadaNaCvmTrue();
    }

    public Optional<Corretora> buscarPorId(UUID id) {
        return corretoraRepository.findById(id);
    }

    public Optional<Corretora> buscarPorCnpj(String cnpj) {
        return corretoraRepository.findByCnpj(cnpj.replaceAll("[^0-9]", ""));
    }

    private boolean validadaNaConsulta(ValidacaoCnpjPort.ConsultaCnpj consulta) {
        return consulta.participanteMercado() || cnpjInfoIndicaParticipanteMercado(consulta.dados());
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
