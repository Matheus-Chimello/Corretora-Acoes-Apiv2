package com.projeto.gestao.infra.adapter;

import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.infra.client.BrasilApiClient;
import com.projeto.gestao.infra.client.dto.BrasilApiCnpjDto;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.Locale;

@Component
public class BrasilApiAdapter implements ValidacaoCnpjPort {

    private final BrasilApiClient brasilApiClient;

    public BrasilApiAdapter(BrasilApiClient brasilApiClient) {
        this.brasilApiClient = brasilApiClient;
    }

    @Override
    public boolean isValidAndMarketParticipant(String cnpj) {
        try {
            BrasilApiCnpjDto dto = brasilApiClient.consultarCnpj(cnpj);
            if (dto == null) return false;

            if (dto.getSituacaoCadastral() == null || dto.getSituacaoCadastral() != 2) {
                return false;
            }

            return isMarketParticipant(dto);
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    @Cacheable(value = "cnpj", key = "#cnpj")
    public CnpjInfo getCnpjInfo(String cnpj) {
        BrasilApiCnpjDto dto = brasilApiClient.consultarCnpj(cnpj);
        if (dto == null) return null;

        String cnaeDescricao = dto.getCnae_principal() != null ? dto.getCnae_principal().getDescricao() : "";
        return new CnpjInfo(
            dto.getRazaoSocial(),
            dto.getNomeFantasia(),
            cnaeDescricao,
            dto.getCep(),
            dto.getEmail(),
            dto.getDdd_telefone_1(),
            dto.getLogradouro(),
            dto.getNumero(),
            dto.getComplemento(),
            dto.getBairro(),
            dto.getMunicipio(),
            dto.getUf(),
            dto.getDescricaoSituacaoCadastral()
        );
    }

    private boolean isMarketParticipant(BrasilApiCnpjDto dto) {
        if (dto.getCnae_principal() != null && dto.getCnae_principal().getCodigo() != null) {
            String cnae = String.valueOf(dto.getCnae_principal().getCodigo());
            if (cnae.startsWith("64") || cnae.startsWith("66")) {
                return true;
            }
        }

        String texto = normalize(String.join(" ",
                safe(dto.getRazaoSocial()),
                safe(dto.getNomeFantasia()),
                dto.getCnae_principal() != null ? safe(dto.getCnae_principal().getDescricao()) : ""
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
