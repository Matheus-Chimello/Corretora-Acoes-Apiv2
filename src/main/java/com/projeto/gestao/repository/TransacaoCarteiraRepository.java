package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.TransacaoCarteira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransacaoCarteiraRepository extends JpaRepository<TransacaoCarteira, UUID> {
    List<TransacaoCarteira> findAllByCarteiraIdOrderByDataHoraDesc(Long carteiraId);
}
