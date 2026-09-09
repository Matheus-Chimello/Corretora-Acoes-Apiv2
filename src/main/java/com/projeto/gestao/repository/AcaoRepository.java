package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.Acao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcaoRepository extends JpaRepository<Acao, UUID> {
    List<Acao> findAllByUsuarioId(UUID usuarioId);
    Optional<Acao> findByIdAndUsuarioId(UUID id, UUID usuarioId);
    Optional<Acao> findByUsuarioIdAndTicker(UUID usuarioId, String ticker);
    boolean existsByUsuarioIdAndTicker(UUID usuarioId, String ticker);
}
