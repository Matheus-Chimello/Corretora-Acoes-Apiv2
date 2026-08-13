package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutenticacaoServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CarteiraRepository carteiraRepository;

    @InjectMocks
    private AutenticacaoService autenticacaoService;

    @Test
    @DisplayName("Deve criar uma carteira zerada ao registrar uma conta")
    void deveCriarCarteiraZeradaAoRegistrar() {
        when(usuarioRepository.findByEmailIgnoreCase("nova@teste.local")).thenReturn(Optional.empty());
        when(usuarioRepository.save(any(Usuario.class))).thenAnswer(invocation -> {
            Usuario usuario = invocation.getArgument(0);
            usuario.setId(UUID.randomUUID());
            return usuario;
        });
        when(carteiraRepository.save(any(Carteira.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Usuario usuario = autenticacaoService.registrar("Nova Conta", "nova@teste.local", "senha123");

        ArgumentCaptor<Carteira> carteiraCaptor = ArgumentCaptor.forClass(Carteira.class);
        verify(carteiraRepository).save(carteiraCaptor.capture());
        Carteira carteira = carteiraCaptor.getValue();
        assertEquals(usuario, carteira.getUsuario());
        assertEquals(BigDecimal.ZERO, carteira.getSaldoAcao());
        assertEquals(BigDecimal.ZERO, carteira.getSaldoEmConta());
        assertNotNull(usuario.getSenhaHash());
    }
}
