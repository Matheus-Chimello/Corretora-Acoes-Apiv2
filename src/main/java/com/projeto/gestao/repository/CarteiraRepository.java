package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.Carteira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface CarteiraRepository extends JpaRepository<Carteira, Long> {
    Optional<Carteira> findById(Long id);
    Optional<Carteira> findFirstByOrderByIdAsc();
    Optional<Carteira> findFirstByUsuarioId(UUID usuarioId);
    Optional<Carteira> findByIdAndUsuarioId(Long id, UUID usuarioId);
    List<Carteira> findAllByUsuarioId(UUID usuarioId);
    List<Carteira> findAllByUsuarioIsNull();
}
