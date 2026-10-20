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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class CarteiraServiceTest {

    @Mock
    private CarteiraRepository carteiraRepository;

    @Mock
    private PosicaoCarteiraRepository posicaoCarteiraRepository;

    @Mock
    private CorretoraRepository corretoraRepository;

    @Mock
    private TransacaoCarteiraRepository transacaoCarteiraRepository;

    @Mock
    private AcaoService acaoService;

    @InjectMocks
    private CarteiraService carteiraService;

    private Usuario usuario;
    private Carteira carteira;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        carteira = carteira(new BigDecimal("100.00"));
        carteira.setId(7L);
    }

    @Test
    @DisplayName("Deve criar carteira zerada quando o usuario nao possui uma")
    void deveCriarCarteiraZerada() {
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.empty());
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Carteira resultado = carteiraService.buscarCarteiraPrincipal(usuario);

        assertEquals(usuario, resultado.getUsuario());
        assertEquals(BigDecimal.ZERO, resultado.getSaldoAcao());
        assertEquals(BigDecimal.ZERO, resultado.getSaldoEmConta());
    }

    @Test
    @DisplayName("Deve comprar ativo na corretora escolhida e registrar a transacao")
    void deveComprarAtivoParaCarteiraDoInvestidor() {
        UUID acaoId = UUID.randomUUID();
        UUID corretoraId = UUID.randomUUID();
        Corretora corretora = corretora(corretoraId);
        Acao acao = acao(acaoId, "PETR4", "10.00");
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao);
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, corretoraId)).thenReturn(Optional.empty());
        when(posicaoCarteiraRepository.save(any(PosicaoCarteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of());

        PosicaoCarteira resultado = carteiraService.comprarAcao(usuario, acaoId, corretoraId, new BigDecimal("2"));

        assertEquals(0, new BigDecimal("2").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(corretora, resultado.getCorretora());
        assertEquals(0, new BigDecimal("80.00").compareTo(carteira.getSaldoEmConta()));
        ArgumentCaptor<TransacaoCarteira> transacaoCaptor = ArgumentCaptor.forClass(TransacaoCarteira.class);
        verify(transacaoCarteiraRepository).save(transacaoCaptor.capture());
        assertEquals(0, new BigDecimal("10.00").compareTo(transacaoCaptor.getValue().getPrecoUnitario()));
        assertEquals(0, new BigDecimal("20.00").compareTo(transacaoCaptor.getValue().getValorTotal()));
    }

    @Test
    @DisplayName("Deve usar o valor unitario informado na compra")
    void deveUsarValorUnitarioInformadoNaCompra() {
        UUID acaoId = UUID.randomUUID();
        UUID corretoraId = UUID.randomUUID();
        Corretora corretora = corretora(corretoraId);
        Acao acao = acao(acaoId, "PETR4", "10.00");
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.buscarPorId(usuario, acaoId)).thenReturn(Optional.of(acao));
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, corretoraId)).thenReturn(Optional.empty());
        when(posicaoCarteiraRepository.save(any(PosicaoCarteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of());

        PosicaoCarteira resultado = carteiraService.comprarAcao(
                usuario,
                acaoId,
                corretoraId,
                new BigDecimal("2"),
                new BigDecimal("12.50")
        );

        assertEquals(0, new BigDecimal("12.50").compareTo(resultado.getPrecoMedio()));
        assertEquals(0, new BigDecimal("75.00").compareTo(carteira.getSaldoEmConta()));
        ArgumentCaptor<TransacaoCarteira> transacaoCaptor = ArgumentCaptor.forClass(TransacaoCarteira.class);
        verify(transacaoCarteiraRepository).save(transacaoCaptor.capture());
        assertEquals(0, new BigDecimal("12.50").compareTo(transacaoCaptor.getValue().getPrecoUnitario()));
        assertEquals(0, new BigDecimal("25.00").compareTo(transacaoCaptor.getValue().getValorTotal()));
    }

    @Test
    @DisplayName("Deve manter posicoes separadas para a mesma acao em corretoras diferentes")
    void deveManterPosicoesSeparadasPorCorretora() {
        UUID acaoId = UUID.randomUUID();
        UUID primeiraCorretoraId = UUID.randomUUID();
        UUID segundaCorretoraId = UUID.randomUUID();
        Acao acao = acao(acaoId, "PETR4", "10.00");
        Corretora primeiraCorretora = corretora(primeiraCorretoraId);
        Corretora segundaCorretora = corretora(segundaCorretoraId);
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao);
        when(corretoraRepository.findById(primeiraCorretoraId)).thenReturn(Optional.of(primeiraCorretora));
        when(corretoraRepository.findById(segundaCorretoraId)).thenReturn(Optional.of(segundaCorretora));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, primeiraCorretoraId)).thenReturn(Optional.empty());
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, segundaCorretoraId)).thenReturn(Optional.empty());
        when(posicaoCarteiraRepository.save(any(PosicaoCarteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of());

        PosicaoCarteira primeiraPosicao = carteiraService.comprarAcao(usuario, acaoId, primeiraCorretoraId, BigDecimal.ONE);
        PosicaoCarteira segundaPosicao = carteiraService.comprarAcao(usuario, acaoId, segundaCorretoraId, BigDecimal.ONE);

        assertEquals(primeiraCorretora, primeiraPosicao.getCorretora());
        assertEquals(segundaCorretora, segundaPosicao.getCorretora());
        assertEquals(0, new BigDecimal("80.00").compareTo(carteira.getSaldoEmConta()));
    }

    @Test
    @DisplayName("Nao deve comprar acao brasileira com quantidade fracionada")
    void naoDeveComprarAcaoBrasileiraComQuantidadeFracionada() {
        UUID acaoId = UUID.randomUUID();
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao(acaoId, "PETR4", "10.00"));

        assertThrows(
                IllegalArgumentException.class,
                () -> carteiraService.comprarAcao(usuario, acaoId, UUID.randomUUID(), new BigDecimal("1.5"))
        );
    }

    @Test
    @DisplayName("Nao deve vender acao brasileira com quantidade fracionada")
    void naoDeveVenderAcaoBrasileiraComQuantidadeFracionada() {
        UUID posicaoId = UUID.randomUUID();
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setId(posicaoId);
        posicao.setCarteira(carteira);
        posicao.setAcao(acao(UUID.randomUUID(), "PETR4", "10.00"));
        posicao.setCorretora(corretora(UUID.randomUUID()));
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(posicaoId, 7L)).thenReturn(Optional.of(posicao));

        assertThrows(
                IllegalArgumentException.class,
                () -> carteiraService.venderAcao(usuario, posicaoId, new BigDecimal("1.5"), new BigDecimal("10.00"))
        );
    }

    @Test
    @DisplayName("Deve transferir acao entre corretoras preservando a quantidade e o preco medio")
    void deveTransferirAcaoEntreCorretoras() {
        UUID acaoId = UUID.randomUUID();
        UUID origemId = UUID.randomUUID();
        UUID destinoId = UUID.randomUUID();
        UUID posicaoId = UUID.randomUUID();
        Acao acao = acao(acaoId, "PETR4", "10.00");
        Corretora origemCorretora = corretora(origemId);
        Corretora destinoCorretora = corretora(destinoId);
        PosicaoCarteira origem = new PosicaoCarteira();
        origem.setId(posicaoId);
        origem.setCarteira(carteira);
        origem.setAcao(acao);
        origem.setCorretora(origemCorretora);
        origem.setQuantidadeTotal(new BigDecimal("3"));
        origem.setPrecoMedio(new BigDecimal("10.00"));
        PosicaoCarteira destino = new PosicaoCarteira();
        destino.setCarteira(carteira);
        destino.setAcao(acao);
        destino.setCorretora(destinoCorretora);
        destino.setQuantidadeTotal(new BigDecimal("2"));
        destino.setPrecoMedio(new BigDecimal("8.00"));

        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(posicaoId, 7L)).thenReturn(Optional.of(origem));
        when(corretoraRepository.findById(destinoId)).thenReturn(Optional.of(destinoCorretora));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, destinoId)).thenReturn(Optional.of(destino));
        when(posicaoCarteiraRepository.save(any(PosicaoCarteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of(origem, destino));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PosicaoCarteira resultado = carteiraService.transferirAcao(usuario, posicaoId, destinoId, BigDecimal.ONE);

        assertEquals(0, new BigDecimal("2").compareTo(origem.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("3").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("8.67").compareTo(resultado.getPrecoMedio()));
        ArgumentCaptor<TransacaoCarteira> transacaoCaptor = ArgumentCaptor.forClass(TransacaoCarteira.class);
        verify(transacaoCarteiraRepository, org.mockito.Mockito.times(2)).save(transacaoCaptor.capture());
        assertEquals(TipoTransacao.TRANSFERENCIA_SAIDA, transacaoCaptor.getAllValues().get(0).getTipo());
        assertEquals(TipoTransacao.TRANSFERENCIA_ENTRADA, transacaoCaptor.getAllValues().get(1).getTipo());
    }

    @Test
    @DisplayName("Nao deve vender com valor unitario invalido")
    void naoDeveVenderComValorUnitarioInvalido() {
        assertThrows(
                IllegalArgumentException.class,
                () -> carteiraService.venderAcao(usuario, UUID.randomUUID(), new BigDecimal("1"), BigDecimal.ZERO)
        );
    }

    @Test
    @DisplayName("Deve calcular o preco medio ponderado em compras acumuladas")
    void deveCalcularPrecoMedioPonderadoEmComprasAcumuladas() {
        UUID acaoId = UUID.randomUUID();
        UUID corretoraId = UUID.randomUUID();
        Corretora corretora = corretora(corretoraId);
        Acao acao = acao(acaoId, "PETR4", "20.00");
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        posicao.setCorretora(corretora);
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        posicao.setPrecoMedio(new BigDecimal("10.00"));

        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao);
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora));
        when(posicaoCarteiraRepository.findByCarteiraIdAndAcaoIdAndCorretoraId(7L, acaoId, corretoraId)).thenReturn(Optional.of(posicao));
        when(posicaoCarteiraRepository.save(posicao)).thenReturn(posicao);
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of(posicao));

        PosicaoCarteira resultado = carteiraService.comprarAcao(usuario, acaoId, corretoraId, new BigDecimal("1"));

        assertEquals(0, new BigDecimal("3").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("13.33").compareTo(resultado.getPrecoMedio()));
    }

    @Test
    @DisplayName("Deve atualizar cada cotacao da carteira e recalcular o saldo investido")
    void deveAtualizarCotacoesDasPosicoes() {
        UUID acaoId = UUID.randomUUID();
        Acao acao = acao(acaoId, "PETR4", "15.00");
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        posicao.setCorretora(corretora(UUID.randomUUID()));
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        posicao.setPrecoMedio(new BigDecimal("10.00"));

        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of(posicao));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao);
        when(carteiraRepository.save(carteira)).thenReturn(carteira);

        List<PosicaoCarteira> resultado = carteiraService.atualizarCotacoesDasPosicoes(usuario);

        assertEquals(List.of(posicao), resultado);
        assertEquals(0, new BigDecimal("30.00").compareTo(carteira.getSaldoAcao()));
        verify(acaoService).atualizarCotacao(usuario, acaoId);
    }

    @Test
    @DisplayName("Nao deve comprar quando o saldo em conta for insuficiente")
    void naoDeveComprarComSaldoInsuficiente() {
        UUID acaoId = UUID.randomUUID();
        UUID corretoraId = UUID.randomUUID();
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(acaoService.atualizarCotacao(usuario, acaoId)).thenReturn(acao(acaoId, "PETR4", "60.00"));
        when(corretoraRepository.findById(corretoraId)).thenReturn(Optional.of(corretora(corretoraId)));

        assertThrows(
                IllegalArgumentException.class,
                () -> carteiraService.comprarAcao(usuario, acaoId, corretoraId, new BigDecimal("2"))
        );
    }

    @Test
    @DisplayName("Deve vender apenas a posicao da carteira autenticada")
    void deveVenderPosicaoDaCarteiraAutenticada() {
        UUID posicaoId = UUID.randomUUID();
        Acao acao = acao(UUID.randomUUID(), "PETR4", "10.00");
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setId(posicaoId);
        posicao.setCarteira(carteira);
        posicao.setAcao(acao);
        posicao.setCorretora(corretora(UUID.randomUUID()));
        posicao.setQuantidadeTotal(new BigDecimal("3"));
        posicao.setPrecoMedio(new BigDecimal("8.00"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(posicaoId, 7L)).thenReturn(Optional.of(posicao));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(posicaoCarteiraRepository.save(posicao)).thenReturn(posicao);
        when(posicaoCarteiraRepository.findAllByCarteiraId(7L)).thenReturn(List.of(posicao));

        PosicaoCarteira resultado = carteiraService.venderAcao(usuario, posicaoId, new BigDecimal("1"), new BigDecimal("12.50"));

        assertEquals(0, new BigDecimal("2").compareTo(resultado.getQuantidadeTotal()));
        assertEquals(0, new BigDecimal("112.50").compareTo(carteira.getSaldoEmConta()));
        ArgumentCaptor<TransacaoCarteira> transacaoCaptor = ArgumentCaptor.forClass(TransacaoCarteira.class);
        verify(transacaoCarteiraRepository).save(transacaoCaptor.capture());
        assertEquals(0, new BigDecimal("12.50").compareTo(transacaoCaptor.getValue().getPrecoUnitario()));
        assertEquals(0, new BigDecimal("12.50").compareTo(transacaoCaptor.getValue().getValorTotal()));
    }

    @Test
    @DisplayName("Deve adicionar saldo a carteira do investidor")
    void deveAdicionarSaldoNaCarteira() {
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(carteiraRepository.save(carteira)).thenReturn(carteira);

        Carteira resultado = carteiraService.realizarAporte(usuario, new BigDecimal("25.00"));

        assertEquals(0, new BigDecimal("125.00").compareTo(resultado.getSaldoEmConta()));
        ArgumentCaptor<TransacaoCarteira> transacaoCaptor = ArgumentCaptor.forClass(TransacaoCarteira.class);
        verify(transacaoCarteiraRepository).save(transacaoCaptor.capture());
        assertEquals(TipoTransacao.APORTE, transacaoCaptor.getValue().getTipo());
        assertEquals(0, new BigDecimal("25.00").compareTo(transacaoCaptor.getValue().getValorTotal()));
    }

    @Test
    void deveRecusarVendaAcimaDaPosicaoSemAlterarSaldo() {
        UUID id = UUID.randomUUID();
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setAcao(acao(UUID.randomUUID(), "PETR4", "10"));
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(id, 7L)).thenReturn(Optional.of(posicao));

        assertThrows(IllegalArgumentException.class,
                () -> carteiraService.venderAcao(usuario, id, new BigDecimal("3"), BigDecimal.TEN));
        assertEquals(0, new BigDecimal("100").compareTo(carteira.getSaldoEmConta()));
        verify(transacaoCarteiraRepository, never()).save(any());
    }

    @Test
    void deveRemoverPosicaoAposVendaIntegral() {
        UUID id = UUID.randomUUID();
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setAcao(acao(UUID.randomUUID(), "PETR4", "10"));
        posicao.setCorretora(corretora(UUID.randomUUID()));
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(id, 7L)).thenReturn(Optional.of(posicao));
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(inv -> inv.getArgument(0));

        PosicaoCarteira resultado = carteiraService.venderAcao(usuario, id, new BigDecimal("2"), new BigDecimal("12"));
        assertEquals(0, resultado.getQuantidadeTotal().signum());
        assertEquals(0, new BigDecimal("124").compareTo(carteira.getSaldoEmConta()));
        verify(posicaoCarteiraRepository).delete(posicao);
    }

    @Test
    void deveRecusarTransferenciaParaMesmaCorretoraOuAcimaDaQuantidade() {
        UUID id = UUID.randomUUID();
        Corretora origem = corretora(UUID.randomUUID());
        PosicaoCarteira posicao = new PosicaoCarteira();
        posicao.setCorretora(origem);
        posicao.setQuantidadeTotal(new BigDecimal("2"));
        when(carteiraRepository.findFirstByUsuarioId(usuario.getId())).thenReturn(Optional.of(carteira));
        when(posicaoCarteiraRepository.findByIdAndCarteiraId(id, 7L)).thenReturn(Optional.of(posicao));

        assertThrows(IllegalArgumentException.class,
                () -> carteiraService.transferirAcao(usuario, id, origem.getId(), BigDecimal.ONE));
        assertThrows(IllegalArgumentException.class,
                () -> carteiraService.transferirAcao(usuario, id, UUID.randomUUID(), new BigDecimal("3")));
        verify(transacaoCarteiraRepository, never()).save(any());
    }

    @Test
    void deveRecusarQuantidadeInvalidaAntesDeBuscarCarteira() {
        assertThrows(IllegalArgumentException.class, () -> carteiraService.realizarAporte(usuario, null));
        assertThrows(IllegalArgumentException.class, () -> carteiraService.realizarAporte(usuario, BigDecimal.ZERO));
        assertThrows(IllegalArgumentException.class, () -> carteiraService.realizarAporte(usuario, BigDecimal.ONE.negate()));
        verify(carteiraRepository, never()).findFirstByUsuarioId(any());
    }

    private Carteira carteira(BigDecimal saldoEmConta) {
        Carteira valor = new Carteira();
        valor.setUsuario(usuario);
        valor.setSaldoAcao(BigDecimal.ZERO);
        valor.setSaldoEmConta(saldoEmConta);
        return valor;
    }

    private Corretora corretora(UUID id) {
        Corretora corretora = new Corretora();
        corretora.setId(id);
        corretora.setValidadaNaCvm(true);
        return corretora;
    }

    private Acao acao(UUID id, String ticker, String cotacao) {
        Acao acao = new Acao();
        acao.setId(id);
        acao.setTicker(ticker);
        acao.setMercado("BR");
        acao.setCotacaoAtual(new BigDecimal(cotacao));
        return acao;
    }
}
