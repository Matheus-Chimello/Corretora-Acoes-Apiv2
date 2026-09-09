package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.domain.port.CotacaoAcaoPort;
import com.projeto.gestao.repository.AcaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AcaoService {

    private static final ZoneId FUSO_HORARIO_SAO_PAULO = ZoneId.of("America/Sao_Paulo");

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
    public Acao cadastrarAcao(Usuario usuario, String ticker, String mercado) {
        validarDadosCadastro(ticker, mercado);

        String tickerNormalizado = ticker.trim().toUpperCase();
        String mercadoNormalizado = mercado.trim().toUpperCase();
        if (acaoRepository.existsByUsuarioIdAndTicker(usuario.getId(), tickerNormalizado)) {
            throw new IllegalArgumentException("Ja existe uma acao cadastrada para este ticker no seu catalogo.");
        }

        CotacaoAcaoPort.CotacaoInfo cotacaoInfo = consultarCotacao(tickerNormalizado, mercadoNormalizado);
        validarMercadoDaCotacao(tickerNormalizado, mercadoNormalizado, cotacaoInfo);

        Acao acao = new Acao();
        acao.setTicker(tickerNormalizado);
        acao.setUsuario(usuario);
        acao.setNomeEmpresa(cotacaoInfo.nomeEmpresa() == null ? tickerNormalizado : cotacaoInfo.nomeEmpresa());
        acao.setMercado(mercadoNormalizado);
        acao.setMoeda(cotacaoInfo.moeda());
        acao.setCotacaoAtual(cotacaoInfo.cotacaoAtual());
        acao.setDataHoraCotacao(agoraEmSaoPaulo());
        return acaoRepository.save(acao);
    }

    @Transactional
    public Acao atualizarCotacao(Usuario usuario, UUID id) {
        Acao acao = buscarPorId(usuario, id)
                .orElseThrow(() -> new IllegalArgumentException("Acao nao encontrada."));
        return atualizarCotacao(acao);
    }

    @Transactional
    public List<Acao> atualizarCotacoesDoCatalogo(Usuario usuario) {
        return acaoRepository.findAllByUsuarioId(usuario.getId()).stream()
                .map(this::atualizarCotacao)
                .toList();
    }

    private Acao atualizarCotacao(Acao acao) {
        CotacaoAcaoPort.CotacaoInfo cotacaoInfo = consultarCotacao(acao.getTicker(), acao.getMercado());
        validarMercadoDaCotacao(acao.getTicker(), acao.getMercado(), cotacaoInfo);
        acao.setCotacaoAtual(cotacaoInfo.cotacaoAtual());
        acao.setNomeEmpresa(cotacaoInfo.nomeEmpresa() == null ? acao.getNomeEmpresa() : cotacaoInfo.nomeEmpresa());
        acao.setMoeda(cotacaoInfo.moeda());
        acao.setDataHoraCotacao(agoraEmSaoPaulo());
        return acaoRepository.save(acao);
    }

    public List<Acao> listarTodas(Usuario usuario) {
        return acaoRepository.findAllByUsuarioId(usuario.getId());
    }

    public Optional<Acao> buscarPorId(Usuario usuario, UUID id) {
        return acaoRepository.findByIdAndUsuarioId(id, usuario.getId());
    }

    public Optional<Acao> buscarPorTicker(Usuario usuario, String ticker) {
        if (ticker == null || ticker.isBlank()) {
            return Optional.empty();
        }
        return acaoRepository.findByUsuarioIdAndTicker(usuario.getId(), ticker.trim().toUpperCase());
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

    private void validarMercadoDaCotacao(
            String ticker,
            String mercado,
            CotacaoAcaoPort.CotacaoInfo cotacaoInfo
    ) {
        String moedaEsperada = "BR".equals(mercado) ? "BRL" : "USD";
        String moedaRecebida = cotacaoInfo.moeda() == null ? "" : cotacaoInfo.moeda().trim().toUpperCase();
        if (!moedaEsperada.equals(moedaRecebida)) {
            String mercadoCorreto = "BRL".equals(moedaRecebida) ? "BR" : "USD".equals(moedaRecebida) ? "US" : "compativel";
            throw new IllegalArgumentException(
                    "O ticker '" + ticker + "' pertence ao mercado " + mercadoCorreto
                            + " e nao pode ser cadastrado como " + mercado + "."
            );
        }
    }

    private LocalDateTime agoraEmSaoPaulo() {
        return LocalDateTime.now(FUSO_HORARIO_SAO_PAULO);
    }
}
