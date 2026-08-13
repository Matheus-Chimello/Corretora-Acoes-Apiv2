package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.PosicaoCarteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.PosicaoCarteiraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;

@Service
public class CarteiraService {

    private final CarteiraRepository carteiraRepository;
    private final PosicaoCarteiraRepository posicaoCarteiraRepository;
    private final AcaoService acaoService;

    public CarteiraService(
            CarteiraRepository carteiraRepository,
            PosicaoCarteiraRepository posicaoCarteiraRepository,
            AcaoService acaoService
    ) {
        this.carteiraRepository = carteiraRepository;
        this.posicaoCarteiraRepository = posicaoCarteiraRepository;
        this.acaoService = acaoService;
    }

    @Transactional
    public PosicaoCarteira comprarAcao(Usuario usuario, java.util.UUID acaoId, BigDecimal quantidade) {
        validarQuantidade(quantidade);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        Acao acao = acaoService.atualizarCotacao(acaoId);
        BigDecimal valorCompra = acao.getCotacaoAtual().multiply(quantidade);

        if (carteira.getSaldoEmConta().compareTo(valorCompra) < 0) {
            throw new IllegalArgumentException("Saldo em conta insuficiente para esta compra.");
        }

        PosicaoCarteira posicao = posicaoCarteiraRepository.findByCarteiraIdAndAcaoId(carteira.getId(), acaoId)
                .orElseGet(() -> novaPosicao(carteira, acao));
        BigDecimal quantidadeAnterior = posicao.getQuantidadeTotal();
        BigDecimal novaQuantidade = quantidadeAnterior.add(quantidade);
        BigDecimal precoMedio = posicao.getPrecoMedio().multiply(quantidadeAnterior)
                .add(acao.getCotacaoAtual().multiply(quantidade))
                .divide(novaQuantidade, 2, RoundingMode.HALF_UP);

        posicao.setQuantidadeTotal(novaQuantidade);
        posicao.setPrecoMedio(precoMedio);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().subtract(valorCompra));
        carteiraRepository.save(carteira);
        PosicaoCarteira salva = posicaoCarteiraRepository.save(posicao);
        calcularSaldoAcao(usuario);
        return salva;
    }

    @Transactional
    public PosicaoCarteira venderAcao(Usuario usuario, String ticker, BigDecimal quantidade) {
        validarQuantidade(quantidade);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        PosicaoCarteira posicao = posicaoCarteiraRepository
                .findByCarteiraIdAndAcaoTickerIgnoreCase(carteira.getId(), ticker)
                .orElseThrow(() -> new IllegalArgumentException("Acao nao encontrada na sua carteira."));

        if (quantidade.compareTo(posicao.getQuantidadeTotal()) > 0) {
            throw new IllegalArgumentException("Quantidade de venda nao pode ser maior que a quantidade disponivel.");
        }

        Acao acao = acaoService.atualizarCotacao(posicao.getAcao().getId());
        BigDecimal valorVenda = acao.getCotacaoAtual().multiply(quantidade);
        BigDecimal quantidadeRestante = posicao.getQuantidadeTotal().subtract(quantidade);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().add(valorVenda));
        carteiraRepository.save(carteira);

        if (quantidadeRestante.signum() == 0) {
            posicaoCarteiraRepository.delete(posicao);
            posicao.setQuantidadeTotal(BigDecimal.ZERO);
            calcularSaldoAcao(usuario);
            return posicao;
        }

        posicao.setQuantidadeTotal(quantidadeRestante);
        PosicaoCarteira salva = posicaoCarteiraRepository.save(posicao);
        calcularSaldoAcao(usuario);
        return salva;
    }

    @Transactional
    public Carteira realizarAporte(Usuario usuario, BigDecimal valor) {
        validarQuantidade(valor);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().add(valor));
        return carteiraRepository.save(carteira);
    }

    @Transactional
    public Carteira atualizarSaldoEmConta(Usuario usuario, Long id, BigDecimal saldoEmConta) {
        if (saldoEmConta == null || saldoEmConta.signum() < 0) {
            throw new IllegalArgumentException("Saldo em conta deve ser um numero maior ou igual a zero.");
        }
        Carteira carteira = buscarPorId(usuario, id)
                .orElseThrow(() -> new IllegalArgumentException("Carteira nao encontrada."));
        carteira.setSaldoEmConta(saldoEmConta);
        return carteiraRepository.save(carteira);
    }

    @Transactional
    public Carteira calcularSaldoAcao(Usuario usuario) {
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        BigDecimal saldoAcao = listarPosicoes(usuario).stream()
                .map(this::valorAtual)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        carteira.setSaldoAcao(saldoAcao);
        return carteiraRepository.save(carteira);
    }

    @Transactional
    public Carteira buscarCarteiraPrincipal(Usuario usuario) {
        return carteiraRepository.findFirstByUsuarioId(usuario.getId())
                .orElseGet(() -> criarCarteira(usuario));
    }

    public List<PosicaoCarteira> listarPosicoes(Usuario usuario) {
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        return posicaoCarteiraRepository.findAllByCarteiraId(carteira.getId()).stream()
                .filter(posicao -> posicao.getQuantidadeTotal().signum() > 0)
                .toList();
    }

    public BigDecimal valorAtual(PosicaoCarteira posicao) {
        BigDecimal cotacao = posicao.getAcao().getCotacaoAtual() == null ? BigDecimal.ZERO : posicao.getAcao().getCotacaoAtual();
        return posicao.getQuantidadeTotal().multiply(cotacao);
    }

    public List<Carteira> listarTodas(Usuario usuario) {
        return carteiraRepository.findAllByUsuarioId(usuario.getId());
    }

    public Optional<Carteira> buscarPorId(Usuario usuario, Long id) {
        return carteiraRepository.findByIdAndUsuarioId(id, usuario.getId());
    }

    private void validarQuantidade(BigDecimal quantidade) {
        if (quantidade == null || quantidade.signum() <= 0) {
            throw new IllegalArgumentException("Quantidade deve ser maior que zero.");
        }
    }

    private PosicaoCarteira novaPosicao(Carteira carteira, Acao acao) {
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        return posicao;
    }

    private Carteira criarCarteira(Usuario usuario) {
        Carteira carteira = new Carteira();
        carteira.setUsuario(usuario);
        carteira.setSaldoAcao(BigDecimal.ZERO);
        carteira.setSaldoEmConta(BigDecimal.ZERO);
        return carteiraRepository.save(carteira);
    }
}
