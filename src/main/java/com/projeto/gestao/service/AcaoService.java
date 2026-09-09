package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.repository.AcaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AcaoService {

    private final AcaoRepository acaoRepository;
    private final CotacaoAcaoPort cotacaoAcaoPort;

    public AcaoService(
            AcaoRepository acaoRepository,
            CotacaoAcaoPort cotacaoAcaoPort
    ) {
        this.acaoRepository = acaoRepository;
        this.cotacaoAcaoPort = cotacaoAcaoPort;
    }

    @Transactional
    public Acao cadastrarAcao(String ticker, String mercado) {
        validarDadosCadastro(ticker, mercado);

        String tickerNormalizado = ticker.trim().toUpperCase();
        String mercadoNormalizado = mercado.trim().toUpperCase();
        if (acaoRepository.existsByTicker(tickerNormalizado)) {
            throw new IllegalArgumentException("Ja existe uma acao cadastrada para este ticker.");
        }

        CotacaoAcaoPort.CotacaoInfo cotacaoInfo = consultarCotacao(tickerNormalizado, mercadoNormalizado);

        Acao acao = new Acao();
        acao.setTicker(tickerNormalizado);
        acao.setNomeEmpresa(cotacaoInfo.nomeEmpresa() == null ? tickerNormalizado : cotacaoInfo.nomeEmpresa());
        acao.setMercado(mercadoNormalizado);
        acao.setMoeda(cotacaoInfo.moeda());
        acao.setCotacaoAtual(cotacaoInfo.cotacaoAtual());
        acao.setDataHoraCotacao(LocalDateTime.now());
        return acaoRepository.save(acao);
    }

    @Transactional
    public Acao atualizarCotacao(UUID id) {
        Acao acao = buscarPorId(id)
                .orElseThrow(() -> new IllegalArgumentException("Acao nao encontrada."));
        return atualizarCotacao(acao);
    }

    @Transactional
    public List<Acao> atualizarCotacoesDoCatalogo() {
        return acaoRepository.findAll().stream()
                .map(this::atualizarCotacao)
                .toList();
    }

    private Acao atualizarCotacao(Acao acao) {
        CotacaoAcaoPort.CotacaoInfo cotacaoInfo = consultarCotacao(acao.getTicker(), acao.getMercado());
        acao.setCotacaoAtual(cotacaoInfo.cotacaoAtual());
        acao.setNomeEmpresa(cotacaoInfo.nomeEmpresa() == null ? acao.getNomeEmpresa() : cotacaoInfo.nomeEmpresa());
        acao.setMoeda(cotacaoInfo.moeda());
        acao.setDataHoraCotacao(LocalDateTime.now());
        return acaoRepository.save(acao);
    }

    public List<Acao> listarTodas() {
        return acaoRepository.findAll();
    }

    public Optional<Acao> buscarPorId(UUID id) {
        return acaoRepository.findById(id);
    }

    public Optional<Acao> buscarPorTicker(String ticker) {
        if (ticker == null || ticker.isBlank()) {
            return Optional.empty();
        }
        return acaoRepository.findByTicker(ticker.trim().toUpperCase());
    }

    private void validarDadosCadastro(String ticker, String mercado) {
        if (ticker == null || ticker.isBlank() || mercado == null || mercado.isBlank()) {
            throw new IllegalArgumentException("Ticker e mercado sao obrigatorios.");
        }
    }

    private CotacaoAcaoPort.CotacaoInfo consultarCotacao(String ticker, String mercado) {
        CotacaoAcaoPort.CotacaoInfo cotacaoInfo = cotacaoAcaoPort.getCotacao(ticker, mercado);
        if (cotacaoInfo == null || cotacaoInfo.cotacaoAtual() == null) {
            throw new IllegalArgumentException("Nao foi possivel obter dados para este ticker.");
        }
        return cotacaoInfo;
    }
}
