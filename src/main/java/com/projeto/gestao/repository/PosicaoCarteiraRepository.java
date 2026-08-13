package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.PosicaoCarteira;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PosicaoCarteiraRepository extends JpaRepository<PosicaoCarteira, UUID> {
    List<PosicaoCarteira> findAllByCarteiraId(Long carteiraId);
    Optional<PosicaoCarteira> findByCarteiraIdAndAcaoId(Long carteiraId, UUID acaoId);
    Optional<PosicaoCarteira> findByCarteiraIdAndAcaoTickerIgnoreCase(Long carteiraId, String ticker);
}
