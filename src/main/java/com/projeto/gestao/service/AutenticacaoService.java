package com.projeto.gestao.service;

import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.UsuarioRepository;
import com.projeto.gestao.config.JwtProperties;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Locale;
import java.time.Instant;

@Service
public class AutenticacaoService {

    private final UsuarioRepository usuarioRepository;
    private final CarteiraRepository carteiraRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    public AutenticacaoService(UsuarioRepository usuarioRepository, CarteiraRepository carteiraRepository,
                               PasswordEncoder passwordEncoder, AuthenticationManager authenticationManager,
                               JwtEncoder jwtEncoder, JwtProperties jwtProperties) {
        this.usuarioRepository = usuarioRepository;
        this.carteiraRepository = carteiraRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtEncoder = jwtEncoder;
        this.jwtProperties = jwtProperties;
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
        var authentication = authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
                normalizarEmail(email), senha == null ? "" : senha));
        Instant issuedAt = Instant.now();
        var claims = JwtClaimsSet.builder().issuer(jwtProperties.issuer()).subject(authentication.getName())
                .issuedAt(issuedAt).expiresAt(issuedAt.plus(jwtProperties.expiration()))
                .claim("authorities", authentication.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority).toList()).build();
        var header = JwsHeader.with(MacAlgorithm.HS256).type("JWT").build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        Usuario usuario = usuarioRepository.findByEmailIgnoreCase(authentication.getName()).orElseThrow();
        return resposta(usuario, token);
    }

    @Transactional
    public void encerrarSessao(String autorizacao) {
        // JWT stateless: o cliente descarta o token; ele permanece valido ate expirar.
        obterUsuarioAutenticado(autorizacao);
    }

    public Usuario obterUsuarioAutenticado(String autorizacao) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticação obrigatória.");
        }
        return usuarioRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sessão inválida ou expirada."));
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
        if (senha.length() < 8 || senha.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A senha deve ter entre 8 e 72 caracteres.");
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

    private String normalizarEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    public record RespostaAutenticacao(String token, String nome, String email, String role, String tipo, long expiresIn) {
    }

    private RespostaAutenticacao resposta(Usuario usuario, String token) {
        return new RespostaAutenticacao(token, usuario.getNome(), usuario.getEmail(), usuario.getPapel().name(),
                "Bearer", jwtProperties.expiration().toSeconds());
    }
}
