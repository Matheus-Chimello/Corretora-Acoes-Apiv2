package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.Corretora;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorretoraRepository extends JpaRepository<Corretora, UUID> {
    List<Corretora> findAllByValidadaNaCvmTrue();
    Optional<Corretora> findByCnpj(String cnpj);
    boolean existsByCnpj(String cnpj);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Corretora c where c.id = :id")
    Optional<Corretora> findByIdParaAtualizar(@Param("id") UUID id);
}
