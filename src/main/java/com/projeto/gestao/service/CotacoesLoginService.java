package com.projeto.gestao.service;

import com.projeto.gestao.repository.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class CotacoesLoginService {
    private static final Logger log = LoggerFactory.getLogger(CotacoesLoginService.class);
    private final UsuarioRepository usuarios;
    private final AcaoService acoes;
    private final CarteiraService carteiras;

    public CotacoesLoginService(UsuarioRepository usuarios, AcaoService acoes, CarteiraService carteiras) {
        this.usuarios = usuarios;
        this.acoes = acoes;
        this.carteiras = carteiras;
    }

    // Executado depois da autenticacao, sem transacao abrangendo as chamadas externas.
    public boolean atualizar(String email) {
        var usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        var catalogo = acoes.listarTodas(usuario);
        boolean completa = true;
        for (var acao : catalogo) {
            try {
                acoes.atualizarCotacao(usuario, acao.getId());
            } catch (RuntimeException exception) {
                completa = false;
                log.warn("Cotacao nao atualizada no login para {}", acao.getTicker());
            }
        }
        if (!catalogo.isEmpty()) {
            try {
                carteiras.calcularSaldoAcao(usuario);
            } catch (RuntimeException exception) {
                completa = false;
                log.warn("Saldo de acoes nao recalculado no login");
            }
        }
        return completa;
    }
}
