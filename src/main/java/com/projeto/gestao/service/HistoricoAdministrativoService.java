package com.projeto.gestao.service;

import com.projeto.gestao.domain.dto.RegistroAdministrativoResponse;
import com.projeto.gestao.domain.model.RegistroAdministrativo;
import com.projeto.gestao.repository.RegistroAdministrativoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HistoricoAdministrativoService {
    private static final int EVENTOS_POR_PAGINA = 20;
    private final RegistroAdministrativoRepository registros;

    public HistoricoAdministrativoService(RegistroAdministrativoRepository registros) {
        this.registros = registros;
    }

    public void registrar(String autor, RegistroAdministrativo.Acao acao, String alvo, String resultado) {
        registros.save(new RegistroAdministrativo(autor, acao, alvo, resultado));
    }

    @Transactional(readOnly = true)
    public Pagina listar(int pagina) {
        if (pagina < 0 || pagina > Integer.MAX_VALUE / EVENTOS_POR_PAGINA) {
            throw new IllegalArgumentException("Número de página inválido.");
        }
        var encontrados = registros.findAllByOrderByDataHoraDescIdDesc(PageRequest.of(pagina, EVENTOS_POR_PAGINA));
        return new Pagina(encontrados.map(RegistroAdministrativoResponse::from).getContent(), encontrados.hasNext());
    }

    public record Pagina(List<RegistroAdministrativoResponse> eventos, boolean temProxima) {}
}
