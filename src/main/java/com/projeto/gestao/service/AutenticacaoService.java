package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

@Service
public class AutenticacaoService {

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AutenticacaoService(UsuarioRepository usuarioRepository, CarteiraRepository carteiraRepository) {
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
    }

    @Transactional
    public Usuario registrar(String nome, String email, String senha) {
        Usuario usuario = criarUsuario(nome, email, senha, PapelUsuario.USER);
        Carteira carteira = new Carteira();
        carteira.setUsuario(usuario);
        carteira.setSaldoAcao(BigDecimal.ZERO);
        carteira.setSaldoEmConta(BigDecimal.ZERO);
        carteiraRepository.save(carteira);
        return usuario;
    }

    @Transactional
    public Usuario garantirUsuarioPadrao(String nome, String email, String senha, PapelUsuario papel) {
        return usuarioRepository.findByEmailIgnoreCase(normalizarEmail(email))
                .orElseGet(() -> criarUsuario(nome, email, senha, papel));
    }

    @Transactional
    public RespostaAutenticacao login(String email, String senha) {
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(normalizarEmail(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou senha inválidos."));

        if (!passwordEncoder.matches(senha == null ? "" : senha, usuario.getSenhaHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Email ou senha inválidos.");
        }

        usuario.setTokenSessao(UUID.randomUUID().toString());
        usuarioRepository.save(usuario);
        return resposta(usuario, usuario.getTokenSessao());
    }

    @Transactional
    public void encerrarSessao(String autorizacao) {
        Usuario usuario = obterUsuarioAutenticado(autorizacao);
        usuario.setTokenSessao(null);
        usuarioRepository.save(usuario);
    }

    public Usuario obterUsuarioAutenticado(String autorizacao) {
        String token = extrairToken(autorizacao);
        return usuarioRepository.findByTokenSessao(token)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida ou expirada."));
    }

    public void exigirAdministrador(Usuario usuario) {
        if (usuario.getPapel() != PapelUsuario.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta operação exige permissão de administrador.");
        }
    }

    public void exigirInvestidor(Usuario usuario) {
        if (usuario.getPapel() != PapelUsuario.USER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta operacao esta disponivel apenas para investidores.");
        }
    }

    public RespostaAutenticacao resposta(Usuario usuario) {
        return resposta(usuario, null);
    }

    private Usuario criarUsuario(String nome, String email, String senha, PapelUsuario papel) {
        String nomeNormalizado = nome == null ? "" : nome.trim();
        String emailNormalizado = normalizarEmail(email);

        if (nomeNormalizado.isBlank() || emailNormalizado.isBlank() || senha == null || senha.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Preencha nome, email e senha.");
        }
        if (!emailNormalizado.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um email válido.");
        }
        if (senha.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha deve ter pelo menos 6 caracteres.");
        }
        if (usuarioRepository.findByEmailIgnoreCase(emailNormalizado).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma conta com este email.");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nomeNormalizado);
        usuario.setEmail(emailNormalizado);
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setPapel(papel);
        return usuarioRepository.save(usuario);
    }

    private String extrairToken(String autorizacao) {
        if (autorizacao == null || !autorizacao.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticação obrigatória.");
        }

        String token = autorizacao.substring("Bearer ".length()).trim();
        if (token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticação obrigatória.");
        }
        return token;
    }

    private String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public record RespostaAutenticacao(String token, String nome, String email, String role) {
    }

    private RespostaAutenticacao resposta(Usuario usuario, String token) {
        return new RespostaAutenticacao(token, usuario.getNome(), usuario.getEmail(), usuario.getPapel().name());
    }
}
