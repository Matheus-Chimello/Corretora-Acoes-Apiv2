package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Corretora;
import com.projeto.gestao.domain.port.BuscaCepPort;
import com.projeto.gestao.domain.port.ValidacaoCnpjPort;
import com.projeto.gestao.repository.CorretoraRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CorretoraServiceTest {

    @Mock
    private CorretoraRepository corretoraRepository;

    @Mock
    private ValidacaoCnpjPort validacaoCnpjPort;

    @Mock
    private BuscaCepPort buscaCepPort;

    @InjectMocks
    private CorretoraService corretoraService;

    private ValidacaoCnpjPort.CnpjInfo cnpjInfoMock;

    @BeforeEach
    void setUp() {
        cnpjInfoMock = new ValidacaoCnpjPort.CnpjInfo(
            "XP INVESTIMENTOS CORRETORA DE CAMBIO, TITULOS E VALORES MOBILIARIOS S/A",
            "XP Investimentos CCTVM S/A",
            "",
            "04538-133",
            "contato@xpi.com.br",
            "1134769600",
            "Av. Brigadeiro Faria Lima",
            "201",
            "6o andar",
            "Itaim Bibi",
            "Sao Paulo",
            "SP",
            "ATIVA"
        );
    }

    @Test
    @DisplayName("Deve cadastrar corretora com sucesso quando CNPJ valido e validada na CVM")
    void deveCadastrarCorretoraComSucesso() {
        String cnpj = "02332886000104";

        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpj)).thenReturn(cnpjInfoMock);
        when(validacaoCnpjPort.isValidAndMarketParticipant(cnpj)).thenReturn(true);
        when(buscaCepPort.getCepInfo(anyString())).thenReturn(
            new BuscaCepPort.CepInfo("04538-133", "Av. Brigadeiro Faria Lima", "6o andar", "Itaim Bibi", "Sao Paulo", "SP")
        );
        when(corretoraRepository.save(any(Corretora.class))).thenAnswer(inv -> {
            Corretora c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        Corretora result = corretoraService.cadastrarCorretora(cnpj);

        assertNotNull(result);
        assertEquals(cnpj, result.getCnpj());
        assertEquals("XP INVESTIMENTOS CORRETORA DE CAMBIO, TITULOS E VALORES MOBILIARIOS S/A", result.getRazaoSocial());
        assertTrue(result.getValidadaNaCvm());
        verify(corretoraRepository).save(any(Corretora.class));
    }

    @Test
    @DisplayName("Deve salvar com validadaNaCvm=false quando os dados nao indicam instituicao financeira")
    void deveSalvarComValidadaNaCvmFalseQuandoNaoFinanceiro() {
        String cnpj = "02332886000104";
        ValidacaoCnpjPort.CnpjInfo cnpjInfoNaoFinanceiro = new ValidacaoCnpjPort.CnpjInfo(
            "MERCADO EXEMPLO LTDA",
            "Mercado Exemplo",
            "Comercio varejista",
            "04538-133",
            "contato@exemplo.com.br",
            "1134769600",
            "Rua Exemplo",
            "100",
            "",
            "Centro",
            "Sao Paulo",
            "SP",
            "ATIVA"
        );

        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpj)).thenReturn(cnpjInfoNaoFinanceiro);
        when(validacaoCnpjPort.isValidAndMarketParticipant(cnpj)).thenReturn(false);
        when(buscaCepPort.getCepInfo(anyString())).thenReturn(cepInfo());
        when(corretoraRepository.save(any(Corretora.class))).thenAnswer(inv -> inv.getArgument(0));

        Corretora result = corretoraService.cadastrarCorretora(cnpj);

        assertFalse(result.getValidadaNaCvm());
    }

    @Test
    @DisplayName("Deve validar CVM pelos dados de cadastro quando CNAE externo vier incompleto")
    void deveValidarCvmPelosDadosDoCadastroQuandoConsultaDiretaFalha() {
        String cnpj = "02332886000104";

        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpj)).thenReturn(cnpjInfoMock);
        when(validacaoCnpjPort.isValidAndMarketParticipant(cnpj)).thenReturn(false);
        when(buscaCepPort.getCepInfo(anyString())).thenReturn(cepInfo());
        when(corretoraRepository.save(any(Corretora.class))).thenAnswer(inv -> inv.getArgument(0));

        Corretora result = corretoraService.cadastrarCorretora(cnpj);

        assertTrue(result.getValidadaNaCvm());
    }

    @Test
    @DisplayName("Deve lancar excecao quando CNPJ ja cadastrado")
    void deveLancarExcecaoQuandoCnpjDuplicado() {
        String cnpj = "02332886000104";
        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(true);

        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> corretoraService.cadastrarCorretora(cnpj)
        );

        assertTrue(ex.getMessage().contains("existe"));
        verify(validacaoCnpjPort, never()).getCnpjInfo(anyString());
    }

    @Test
    @DisplayName("Deve lancar excecao quando Brasil API nao retorna dados")
    void deveLancarExcecaoQuandoBrasilApiNaoRetornaDados() {
        String cnpj = "02332886000104";
        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpj)).thenReturn(null);

        IllegalArgumentException ex = assertThrows(
            IllegalArgumentException.class,
            () -> corretoraService.cadastrarCorretora(cnpj)
        );

        assertTrue(ex.getMessage().contains("Brasil API"));
        verify(corretoraRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve remover pontuacao do CNPJ antes de processar")
    void deveRemoverPontuacaoDoCnpj() {
        String cnpjFormatado = "02.332.886/0001-04";
        String cnpjLimpo = "02332886000104";

        when(corretoraRepository.existsByCnpj(cnpjLimpo)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpjLimpo)).thenReturn(cnpjInfoMock);
        when(validacaoCnpjPort.isValidAndMarketParticipant(cnpjLimpo)).thenReturn(true);
        when(buscaCepPort.getCepInfo(anyString())).thenReturn(cepInfo());
        when(corretoraRepository.save(any(Corretora.class))).thenAnswer(inv -> inv.getArgument(0));

        Corretora result = corretoraService.cadastrarCorretora(cnpjFormatado);

        assertEquals(cnpjLimpo, result.getCnpj());
    }

    @Test
    @DisplayName("Deve recusar CNPJ com digitos verificadores invalidos antes da consulta externa")
    void deveRecusarCnpjComDigitosInvalidos() {
        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> corretoraService.cadastrarCorretora("02.332.886/0001-05")
        );

        assertTrue(ex.getMessage().contains("CNPJ invalido"));
        verify(validacaoCnpjPort, never()).getCnpjInfo(anyString());
    }

    @Test
    @DisplayName("Deve recusar corretora quando o CEP nao puder ser validado")
    void deveRecusarCorretoraComCepNaoValidado() {
        String cnpj = "02332886000104";
        when(corretoraRepository.existsByCnpj(cnpj)).thenReturn(false);
        when(validacaoCnpjPort.getCnpjInfo(cnpj)).thenReturn(cnpjInfoMock);
        when(validacaoCnpjPort.isValidAndMarketParticipant(cnpj)).thenReturn(true);
        when(buscaCepPort.getCepInfo(anyString())).thenReturn(null);

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> corretoraService.cadastrarCorretora(cnpj)
        );

        assertTrue(ex.getMessage().contains("CEP"));
        verify(corretoraRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve buscar corretora por ID")
    void deveBuscarPorId() {
        UUID id = UUID.randomUUID();
        Corretora corretora = new Corretora();
        corretora.setId(id);
        when(corretoraRepository.findById(id)).thenReturn(Optional.of(corretora));

        Optional<Corretora> result = corretoraService.buscarPorId(id);

        assertTrue(result.isPresent());
        assertEquals(id, result.get().getId());
    }

    @Test
    @DisplayName("Deve retornar vazio quando corretora nao encontrada por ID")
    void deveRetornarVazioQuandoNaoEncontradoPorId() {
        UUID id = UUID.randomUUID();
        when(corretoraRepository.findById(id)).thenReturn(Optional.empty());

        Optional<Corretora> result = corretoraService.buscarPorId(id);

        assertTrue(result.isEmpty());
    }

    private BuscaCepPort.CepInfo cepInfo() {
        return new BuscaCepPort.CepInfo("04538-133", "Av. Brigadeiro Faria Lima", "6o andar", "Itaim Bibi", "Sao Paulo", "SP");
    }
}
