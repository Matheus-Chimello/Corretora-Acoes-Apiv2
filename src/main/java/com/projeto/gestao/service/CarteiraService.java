package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.model.PosicaoCarteira;
import com.projeto.gestao.domain.model.TipoTransacao;
import com.projeto.gestao.domain.model.TransacaoCarteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.CorretoraRepository;
import com.projeto.gestao.repository.PosicaoCarteiraRepository;
import com.projeto.gestao.repository.TransacaoCarteiraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CarteiraService {

    private final CarteiraRepository carteiraRepository;
    private final PosicaoCarteiraRepository posicaoCarteiraRepository;
    private final AcaoService acaoService;
    private final CorretoraRepository corretoraRepository;
    private final TransacaoCarteiraRepository transacaoCarteiraRepository;

    public CarteiraService(
            CarteiraRepository carteiraRepository,
            PosicaoCarteiraRepository posicaoCarteiraRepository,
            AcaoService acaoService,
            CorretoraRepository corretoraRepository,
            TransacaoCarteiraRepository transacaoCarteiraRepository
    ) {
        this.carteiraRepository = carteiraRepository;
        this.posicaoCarteiraRepository = posicaoCarteiraRepository;
        this.acaoService = acaoService;
        this.corretoraRepository = corretoraRepository;
        this.transacaoCarteiraRepository = transacaoCarteiraRepository;
    }

    @Transactional
    public PosicaoCarteira comprarAcao(Usuario usuario, UUID acaoId, UUID corretoraId, BigDecimal quantidade) {
        return comprarAcao(usuario, acaoId, corretoraId, quantidade, null);
    }

    @Transactional
    public PosicaoCarteira comprarAcao(
            Usuario usuario,
            UUID acaoId,
            UUID corretoraId,
            BigDecimal quantidade,
            BigDecimal valorUnitario
    ) {
        validarQuantidade(quantidade);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        Acao acao = valorUnitario == null
                ? acaoService.atualizarCotacao(usuario, acaoId)
                : acaoService.buscarPorId(usuario, acaoId)
                        .orElseThrow(() -> new IllegalArgumentException("Acao nao encontrada."));
        validarQuantidadeDoMercado(acao, quantidade);
        Corretora corretora = buscarCorretoraObrigatoria(corretoraId);
        BigDecimal precoCompra = valorUnitario == null ? acao.getCotacaoAtual() : valorUnitario;
        validarValorUnitario(precoCompra);
        BigDecimal valorCompra = precoCompra.multiply(quantidade);

        if (carteira.getSaldoEmConta().compareTo(valorCompra) < 0) {
            throw new IllegalArgumentException("Saldo em conta insuficiente para esta compra.");
        }

        PosicaoCarteira posicao = posicaoCarteiraRepository
                .findByCarteiraIdAndAcaoIdAndCorretoraId(carteira.getId(), acaoId, corretoraId)
                .orElseGet(() -> novaPosicao(carteira, acao, corretora));
        BigDecimal quantidadeAnterior = posicao.getQuantidadeTotal();
        BigDecimal novaQuantidade = quantidadeAnterior.add(quantidade);
        BigDecimal precoMedio = posicao.getPrecoMedio().multiply(quantidadeAnterior)
                .add(precoCompra.multiply(quantidade))
                .divide(novaQuantidade, 2, RoundingMode.HALF_UP);

        posicao.setQuantidadeTotal(novaQuantidade);
        posicao.setPrecoMedio(precoMedio);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().subtract(valorCompra));
        carteiraRepository.save(carteira);
        PosicaoCarteira salva = posicaoCarteiraRepository.save(posicao);
        registrarTransacao(carteira, acao, corretora, TipoTransacao.COMPRA, quantidade, precoCompra, valorCompra);
        calcularSaldoAcao(usuario);
        return salva;
    }

    @Transactional
    public PosicaoCarteira venderAcao(Usuario usuario, UUID posicaoId, BigDecimal quantidade, BigDecimal valorUnitario) {
        validarQuantidade(quantidade);
        validarValorUnitario(valorUnitario);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        PosicaoCarteira posicao = posicaoCarteiraRepository
                .findByIdAndCarteiraId(posicaoId, carteira.getId())
                .orElseThrow(() -> new IllegalArgumentException("Posicao nao encontrada na sua carteira."));
        validarQuantidadeDoMercado(posicao.getAcao(), quantidade);

        if (quantidade.compareTo(posicao.getQuantidadeTotal()) > 0) {
            throw new IllegalArgumentException("Quantidade de venda nao pode ser maior que a quantidade disponivel.");
        }

        Acao acao = posicao.getAcao();
        BigDecimal valorVenda = valorUnitario.multiply(quantidade);
        BigDecimal quantidadeRestante = posicao.getQuantidadeTotal().subtract(quantidade);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().add(valorVenda));
        carteiraRepository.save(carteira);
        registrarTransacao(carteira, acao, posicao.getCorretora(), TipoTransacao.VENDA, quantidade, valorUnitario, valorVenda);

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
    public PosicaoCarteira transferirAcao(Usuario usuario, UUID posicaoId, UUID corretoraDestinoId, BigDecimal quantidade) {
        validarQuantidade(quantidade);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        PosicaoCarteira origem = posicaoCarteiraRepository
                .findByIdAndCarteiraId(posicaoId, carteira.getId())
                .orElseThrow(() -> new IllegalArgumentException("Posicao nao encontrada na sua carteira."));

        if (origem.getCorretora().getId().equals(corretoraDestinoId)) {
            throw new IllegalArgumentException("Selecione uma corretora de destino diferente da origem.");
        }
        if (quantidade.compareTo(origem.getQuantidadeTotal()) > 0) {
            throw new IllegalArgumentException("Quantidade de transferencia nao pode ser maior que a quantidade disponivel.");
        }

        Corretora corretoraDestino = buscarCorretoraObrigatoria(corretoraDestinoId);
        PosicaoCarteira destino = posicaoCarteiraRepository
                .findByCarteiraIdAndAcaoIdAndCorretoraId(carteira.getId(), origem.getAcao().getId(), corretoraDestinoId)
                .orElseGet(() -> novaPosicao(carteira, origem.getAcao(), corretoraDestino));

        BigDecimal quantidadeDestino = destino.getQuantidadeTotal();
        BigDecimal novaQuantidadeDestino = quantidadeDestino.add(quantidade);
        BigDecimal precoMedioDestino = destino.getPrecoMedio().multiply(quantidadeDestino)
                .add(origem.getPrecoMedio().multiply(quantidade))
                .divide(novaQuantidadeDestino, 2, RoundingMode.HALF_UP);
        destino.setQuantidadeTotal(novaQuantidadeDestino);
        destino.setPrecoMedio(precoMedioDestino);
        PosicaoCarteira destinoSalva = posicaoCarteiraRepository.save(destino);

        BigDecimal quantidadeRestante = origem.getQuantidadeTotal().subtract(quantidade);
        if (quantidadeRestante.signum() == 0) {
            posicaoCarteiraRepository.delete(origem);
        } else {
            origem.setQuantidadeTotal(quantidadeRestante);
            posicaoCarteiraRepository.save(origem);
        }

        BigDecimal valorTransferido = origem.getPrecoMedio().multiply(quantidade);
        registrarTransacao(carteira, origem.getAcao(), origem.getCorretora(), TipoTransacao.TRANSFERENCIA_SAIDA, quantidade, origem.getPrecoMedio(), valorTransferido);
        registrarTransacao(carteira, origem.getAcao(), corretoraDestino, TipoTransacao.TRANSFERENCIA_ENTRADA, quantidade, origem.getPrecoMedio(), valorTransferido);
        calcularSaldoAcao(usuario);
        return destinoSalva;
    }

    @Transactional
    public Carteira realizarAporte(Usuario usuario, BigDecimal valor) {
        validarQuantidade(valor);
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        carteira.setSaldoEmConta(carteira.getSaldoEmConta().add(valor));
        Carteira salva = carteiraRepository.save(carteira);
        registrarTransacao(salva, null, null, TipoTransacao.APORTE, BigDecimal.ONE, valor, valor);
        return salva;
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

    public List<TransacaoCarteira> listarTransacoes(Usuario usuario) {
        Carteira carteira = buscarCarteiraPrincipal(usuario);
        return transacaoCarteiraRepository.findAllByCarteiraIdOrderByDataHoraDesc(carteira.getId());
    }

    @Transactional
    public List<PosicaoCarteira> atualizarCotacoesDasPosicoes(Usuario usuario) {
        List<PosicaoCarteira> posicoes = listarPosicoes(usuario);

        posicoes.stream()
                .map(posicao -> posicao.getAcao().getId())
                .distinct()
                .forEach(acaoId -> acaoService.atualizarCotacao(usuario, acaoId));

        calcularSaldoAcao(usuario);
        return listarPosicoes(usuario);
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

    private void validarQuantidadeDoMercado(Acao acao, BigDecimal quantidade) {
        if ("BR".equalsIgnoreCase(acao.getMercado()) && quantidade.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Acoes brasileiras permitem somente quantidade inteira.");
        }
    }

    private void validarValorUnitario(BigDecimal valorUnitario) {
        if (valorUnitario == null || valorUnitario.signum() <= 0) {
            throw new IllegalArgumentException("Valor unitario deve ser maior que zero.");
        }
    }

    private PosicaoCarteira novaPosicao(Carteira carteira, Acao acao, Corretora corretora) {
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        posicao.setCorretora(corretora);
        return posicao;
    }

    private Corretora buscarCorretoraObrigatoria(UUID corretoraId) {
        Corretora corretora = corretoraRepository.findById(corretoraId)
                .orElseThrow(() -> new IllegalArgumentException("Corretora nao encontrada."));
        if (!Boolean.TRUE.equals(corretora.getValidadaNaCvm())) {
            throw new IllegalArgumentException("A compra exige uma corretora validada na CVM.");
        }
        return corretora;
    }

    private void registrarTransacao(
            Carteira carteira,
            Acao acao,
            Corretora corretora,
            TipoTransacao tipo,
            BigDecimal quantidade,
            BigDecimal precoUnitario,
            BigDecimal valorTotal
    ) {
        TransacaoCarteira transacao = new TransacaoCarteira();
        transacao.setCarteira(carteira);
        transacao.setAcao(acao);
        transacao.setCorretora(corretora);
        transacao.setTipo(tipo);
        transacao.setQuantidade(quantidade);
        transacao.setPrecoUnitario(precoUnitario);
        transacao.setValorTotal(valorTotal);
        transacao.setDataHora(java.time.LocalDateTime.now());
        transacaoCarteiraRepository.save(transacao);
    }

    private Carteira criarCarteira(Usuario usuario) {
        Carteira carteira = new Carteira();
        carteira.setUsuario(usuario);
        carteira.setSaldoAcao(BigDecimal.ZERO);
        carteira.setSaldoEmConta(BigDecimal.ZERO);
        return carteiraRepository.save(carteira);
    }
}
