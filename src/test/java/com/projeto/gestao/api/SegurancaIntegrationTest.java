package com.projeto.gestao.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.projeto.gestao.domain.model.PapelUsuario;
import com.projeto.gestao.domain.model.Usuario;
import com.projeto.gestao.domain.model.Acao;
import com.projeto.gestao.domain.model.Carteira;
import com.projeto.gestao.repository.UsuarioRepository;
import com.projeto.gestao.repository.CarteiraRepository;
import com.projeto.gestao.repository.AcaoRepository;
import com.projeto.gestao.config.JwtProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.List;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SegurancaIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired UsuarioRepository usuarios;
    @Autowired CarteiraRepository carteiras;
    @Autowired AcaoRepository acoes;
    @Autowired JwtDecoder decoder;
    @Autowired JwtEncoder encoder;
    @Autowired JwtProperties properties;

    @BeforeEach
    void prepararUsuario() {
        Usuario usuario = new Usuario();
        usuario.setNome("Pessoa de teste");
        usuario.setEmail("jwt@teste.local");
        usuario.setSenhaHash(new BCryptPasswordEncoder().encode("senha-teste"));
        usuario.setPapel(PapelUsuario.USER);
        usuarios.save(usuario);
    }

    @Test
    void loginDeveEmitirJwtAssinadoComValidade() throws Exception {
        var resultado = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", "jwt@teste.local", "password", "senha-teste"))))
                .andExpect(status().isOk()).andReturn();
        var resposta = mapper.readTree(resultado.getResponse().getContentAsString());
        assertThat(resposta.get("token").asText().split("\\.")).hasSize(3);
        assertThat(resposta.get("tipo").asText()).isEqualTo("Bearer");
        assertThat(resposta.get("expiresIn").asLong()).isEqualTo(3600);
        var jwt = decoder.decode(resposta.get("token").asText());
        assertThat(jwt.getSubject()).isEqualTo("jwt@teste.local");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo(properties.issuer());
        assertThat(jwt.getClaimAsStringList("authorities")).containsExactly("ROLE_USER");
        assertThat(jwt.getExpiresAt()).isEqualTo(jwt.getIssuedAt().plusSeconds(3600));
        assertThat(jwt.getClaims()).doesNotContainKeys("password", "senha", "senhaHash");
        assertThat(resultado.getRequest().getSession(false)).isNull();
    }

    @Test
    @WithMockUser(username = "jwt@teste.local", roles = "USER")
    void userNaoDeveAlterarDadosDeNegocio() throws Exception {
        mvc.perform(post("/carteiras/principal/aportes").contentType(MediaType.APPLICATION_JSON)
                .content("{\"valor\":100}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDeveCriarUsuarioSemExporSenha() throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Nova pessoa\",\"email\":\"nova@teste.local\",\"password\":\"senha-nova\",\"papel\":\"USER\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("nova@teste.local"))
                .andExpect(jsonPath("$.ativo").value(true))
                .andExpect(jsonPath("$.senhaHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
        var usuario = usuarios.findByEmailIgnoreCase("nova@teste.local").orElseThrow();
        assertThat(new BCryptPasswordEncoder().matches("senha-nova", usuario.getSenhaHash())).isTrue();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDeveAlterarCadastroSemTrocarSenha() throws Exception {
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        String hashAnterior = usuario.getSenhaHash();
        mvc.perform(put("/api/usuarios/{id}", usuario.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Nome atualizado\",\"email\":\"jwt@teste.local\",\"papel\":\"ADMIN\",\"ativo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.papel").value("ADMIN"))
                .andExpect(jsonPath("$.ativo").value(false));
        assertThat(usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash()).isEqualTo(hashAnterior);
        requisitarLogin("jwt@teste.local", "senha-teste").andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDeveTrocarSenhaComNovoHash() throws Exception {
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        String anterior = usuario.getSenhaHash();
        mvc.perform(put("/api/usuarios/{id}/senha", usuario.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"nova-senha-teste\"}"))
                .andExpect(status().isNoContent());
        var hash = usuarios.findById(usuario.getId()).orElseThrow().getSenhaHash();
        assertThat(hash).isNotEqualTo(anterior).isNotEqualTo("nova-senha-teste");
        assertThat(new BCryptPasswordEncoder().matches("nova-senha-teste", hash)).isTrue();
        requisitarLogin("jwt@teste.local", "senha-teste").andExpect(status().isUnauthorized());
        requisitarLogin("jwt@teste.local", "nova-senha-teste").andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminDeveConsultarUsuariosSemExporHash() throws Exception {
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        mvc.perform(get("/api/usuarios")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("jwt@teste.local"))
                .andExpect(jsonPath("$[0].senhaHash").doesNotExist())
                .andExpect(jsonPath("$[0].password").doesNotExist());
        mvc.perform(get("/api/usuarios/{id}", usuario.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(usuario.getId().toString()))
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
        mvc.perform(get("/api/usuarios/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @CsvSource({"7,400", "8,201", "72,201", "73,400"})
    @WithMockUser(roles = "ADMIN")
    void deveValidarLimitesDeSenhaNoCadastro(int tamanho, int statusEsperado) throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("nome", "Pessoa", "email", "limite@teste.local",
                        "password", "s".repeat(tamanho), "papel", "USER"))))
                .andExpect(status().is(statusEsperado));
        assertThat(usuarios.findByEmailIgnoreCase("limite@teste.local").isPresent()).isEqualTo(statusEsperado == 201);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void deveRecusarEmailDuplicadoNaApiSemCriarOutroUsuario() throws Exception {
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Outra pessoa\",\"email\":\"JWT@TESTE.LOCAL\",\"password\":\"senha-teste\",\"papel\":\"USER\"}"))
                .andExpect(status().isConflict());
        assertThat(usuarios.count()).isEqualTo(1);
    }

    @Test
    @WithMockUser(roles = "USER")
    void userNaoDeveAcessarNenhumaOperacaoAdministrativa() throws Exception {
        UUID id = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow().getId();
        mvc.perform(get("/api/usuarios/{id}", id)).andExpect(status().isForbidden());
        mvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Pessoa\",\"email\":\"nova@teste.local\",\"password\":\"senha-teste\",\"papel\":\"ADMIN\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/usuarios/{id}", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nome\":\"Pessoa\",\"email\":\"nova@teste.local\",\"papel\":\"ADMIN\",\"ativo\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/usuarios/{id}/senha", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"password\":\"senha-nova\"}"))
                .andExpect(status().isForbidden());
        assertThat(usuarios.findById(id).orElseThrow().getPapel()).isEqualTo(PapelUsuario.USER);
    }

    @Test
    void deveExigirAutenticacaoComErroJson() throws Exception {
        for (String path : List.of("/acoes", "/corretoras", "/carteiras", "/api/dashboard/stats", "/auth/me", "/api/usuarios")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.status").value(401))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void deveRecusarSenhaIncorretaOuContaAusenteOuInativa() throws Exception {
        requisitarLogin("jwt@teste.local", "incorreta").andExpect(status().isUnauthorized());
        requisitarLogin("ausente@teste.local", "senha-teste").andExpect(status().isUnauthorized());
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        usuario.setAtivo(false);
        usuarios.save(usuario);
        requisitarLogin("jwt@teste.local", "senha-teste").andExpect(status().isUnauthorized());
    }

    @Test
    void deveValidarDadosDoLogin() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.email").exists());
    }

    @Test
    void deveConsultarRecursosEIdentidadeComJwtReal() throws Exception {
        String token = login();
        for (String path : List.of("/corretoras", "/acoes", "/carteiras", "/api/dashboard/stats")) {
            mvc.perform(get(path).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        }
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.username").value("jwt@teste.local"))
                .andExpect(jsonPath("$.authorities[0]").value("ROLE_USER"));
    }

    @Test
    void deveRecusarTokenAdulteradoExpiradoOuDeOutroEmissor() throws Exception {
        String token = login();
        String[] partes = token.split("\\.");
        String assinatura = (partes[2].startsWith("a") ? "b" : "a") + partes[2].substring(1);
        String adulterado = partes[0] + "." + partes[1] + "." + assinatura;
        for (String invalido : List.of("invalido", adulterado,
                emitirToken(properties.issuer(), Instant.now().minusSeconds(7200), Instant.now().minusSeconds(3600)),
                emitirToken("outro-emissor", Instant.now(), Instant.now().plusSeconds(3600)))) {
            mvc.perform(get("/auth/me").header("Authorization", "Bearer " + invalido))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
        }
    }

    @Test
    void userComJwtRealNaoDeveEscreverNemAdministrar() throws Exception {
        String token = login();
        mvc.perform(post("/carteiras/principal/aportes").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":100}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403));
        mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + token)).andExpect(status().isForbidden());
        mvc.perform(post("/auth/register").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        assertThat(carteiras.findAll()).isEmpty();
    }

    @Test
    void adminComJwtRealDeveAlterarDados() throws Exception {
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        usuario.setPapel(PapelUsuario.ADMIN);
        usuarios.save(usuario);
        mvc.perform(post("/carteiras/principal/aportes").header("Authorization", "Bearer " + login())
                .contentType(MediaType.APPLICATION_JSON).content("{\"valor\":100}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.saldoEmConta").value(100));
        assertThat(carteiras.findAll()).singleElement()
                .satisfies(carteira -> assertThat(carteira.getSaldoEmConta()).isEqualByComparingTo("100"));
    }

    @Test
    void deveManterTokenEmitidoValidoAteExpirar() throws Exception {
        String token = login();
        var usuario = usuarios.findByEmailIgnoreCase("jwt@teste.local").orElseThrow();
        usuario.setPapel(PapelUsuario.ADMIN);
        usuario.setAtivo(false);
        usuarios.save(usuario);
        mvc.perform(post("/auth/logout").header("Authorization", "Bearer " + token)).andExpect(status().isNoContent());
        mvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.authorities[0]").value("ROLE_USER"));
        requisitarLogin("jwt@teste.local", "senha-teste").andExpect(status().isUnauthorized());
    }

    @Test
    void deveIsolarAcoesECarteirasDeOutrosUsuarios() throws Exception {
        var outro = new Usuario();
        outro.setNome("Outra pessoa"); outro.setEmail("outra@teste.local");
        outro.setSenhaHash(new BCryptPasswordEncoder().encode("senha-teste")); outro.setPapel(PapelUsuario.USER);
        usuarios.save(outro);
        var carteira = new Carteira(); carteira.setUsuario(outro); carteiras.save(carteira);
        var acao = new Acao(); acao.setTicker("TEST4"); acao.setUsuario(outro); acao.setMercado("BR");
        acoes.save(acao);
        String token = login();
        mvc.perform(get("/carteiras/{id}", carteira.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        mvc.perform(get("/acoes/{id}", acao.getId()).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
        mvc.perform(get("/acoes").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void devePermitirPreflightDoFrontendConhecido() throws Exception {
        mvc.perform(options("/auth/login").header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type,authorization"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    private org.springframework.test.web.servlet.ResultActions requisitarLogin(String email, String password) throws Exception {
        return mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", email, "password", password))));
    }

    private String login() throws Exception {
        var resultado = requisitarLogin("jwt@teste.local", "senha-teste").andExpect(status().isOk()).andReturn();
        return mapper.readTree(resultado.getResponse().getContentAsString()).get("token").asText();
    }

    private String emitirToken(String issuer, Instant issuedAt, Instant expiresAt) {
        var claims = JwtClaimsSet.builder().subject("jwt@teste.local").issuer(issuer)
                .issuedAt(issuedAt).expiresAt(expiresAt).claim("authorities", List.of("ROLE_USER")).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }
}
