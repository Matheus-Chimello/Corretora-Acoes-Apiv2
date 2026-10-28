package com.projeto.gestao.api;

import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.DriverManager;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=" + MigracaoJwtLegadaIntegrationTest.DATABASE_URL)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ContextConfiguration(initializers = MigracaoJwtLegadaIntegrationTest.BancoLegado.class)
@DirtiesContext
class MigracaoJwtLegadaIntegrationTest {
    static final String DATABASE_URL = "jdbc:h2:mem:jwt_legado;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
    private static final UUID USUARIO_ID = UUID.fromString("00000000-0000-0000-0000-000000000017");

    @Autowired private MockMvc mvc;

    @Test
    @WithMockUser(roles = "ADMIN")
    void deveIniciarComSituacaoPreexistenteEPreservarUsuarioInativo() throws Exception {
        mvc.perform(get("/api/usuarios/{id}", USUARIO_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Usuario legado"))
                .andExpect(jsonPath("$.email").value("legado@teste.local"))
                .andExpect(jsonPath("$.ativo").value(false));
    }

    public static class BancoLegado implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext context) {
            try (var connection = DriverManager.getConnection(DATABASE_URL, "sa", "")) {
                var database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection));
                try (var liquibase = new Liquibase("db/changelog/db.changelog-pre-jwt.xml",
                        new ClassLoaderResourceAccessor(), database)) {
                    liquibase.update(new Contexts(), new LabelExpression());
                    try (var statement = connection.createStatement()) {
                        statement.execute("ALTER TABLE usuarios ADD ativo BOOLEAN DEFAULT TRUE NOT NULL");
                    }
                    try (var statement = connection.prepareStatement(
                            "INSERT INTO usuarios (id,nome,email,senha_hash,papel,ativo) VALUES (?,?,?,?,?,?)")) {
                        statement.setObject(1, USUARIO_ID);
                        statement.setString(2, "Usuario legado");
                        statement.setString(3, "legado@teste.local");
                        statement.setString(4, new BCryptPasswordEncoder().encode("senha-isolada-teste"));
                        statement.setString(5, "USER");
                        statement.setBoolean(6, false);
                        statement.executeUpdate();
                    }
                }
            } catch (Exception exception) {
                throw new IllegalStateException("Falha ao preparar banco legado isolado", exception);
            }
        }
    }
}
