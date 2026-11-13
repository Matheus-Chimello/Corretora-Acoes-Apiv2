package com.projeto.gestao.repository;

import com.projeto.gestao.domain.model.RegistroAdministrativo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistroAdministrativoRepository extends JpaRepository<RegistroAdministrativo, Long> {
    Slice<RegistroAdministrativo> findAllByOrderByDataHoraDescIdDesc(Pageable pageable);
}
