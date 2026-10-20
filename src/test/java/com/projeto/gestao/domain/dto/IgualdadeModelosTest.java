package com.projeto.gestao.domain.dto;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Corretora;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class IgualdadeModelosTest {
    @Test
    void acoesSaoComparadasPorIdETicker() {
        UUID id = UUID.randomUUID();
        Acao a = new Acao(); a.setId(id); a.setTicker("PETR4");
        Acao b = new Acao(); b.setId(id); b.setTicker("PETR4");
        assertEquals(a, a); assertNotEquals(null, a); assertNotEquals("texto", a);
        assertEquals(a, b); assertEquals(a.hashCode(), b.hashCode());
        b.setTicker("VALE3"); assertNotEquals(a, b);
        b.setId(UUID.randomUUID()); assertNotEquals(a, b);
    }

    @Test
    void corretorasSaoComparadasPorIdECnpj() {
        UUID id = UUID.randomUUID();
        Corretora a = new Corretora(); a.setId(id); a.setCnpj("123");
        Corretora b = new Corretora(); b.setId(id); b.setCnpj("123");
        assertEquals(a, a); assertNotEquals(null, a); assertNotEquals("texto", a);
        assertEquals(a, b); assertEquals(a.hashCode(), b.hashCode());
        b.setCnpj("456"); assertNotEquals(a, b);
        b.setId(UUID.randomUUID()); assertNotEquals(a, b);
    }

    @Test
    void carteirasSaoComparadasPelosSaldos() {
        Carteira a = new Carteira(); a.setSaldoAcao(BigDecimal.TEN); a.setSaldoEmConta(BigDecimal.ONE);
        Carteira b = new Carteira(); b.setSaldoAcao(BigDecimal.TEN); b.setSaldoEmConta(BigDecimal.ONE);
        assertNotEquals(null, a); assertNotEquals("texto", a);
        assertEquals(a, b); assertEquals(a.hashCode(), b.hashCode());
        b.setSaldoEmConta(BigDecimal.ZERO); assertNotEquals(a, b);
        b.setSaldoAcao(BigDecimal.ZERO); assertNotEquals(a, b);
    }
}
