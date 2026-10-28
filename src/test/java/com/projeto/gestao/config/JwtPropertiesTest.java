package com.projeto.gestao.config;

import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.assertj.core.api.Assertions.*;

class JwtPropertiesTest {
    private static final String SECRET = "x".repeat(32);

    @Test
    void deveExigirChaveComPeloMenos32Bytes() {
        assertThatThrownBy(() -> new JwtProperties(null, Duration.ofHours(1), "teste"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("32 bytes");
        assertThatThrownBy(() -> new JwtProperties("x".repeat(31), Duration.ofHours(1), "teste"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("32 bytes");
        assertThat(new JwtProperties(SECRET, Duration.ofHours(1), "teste").secret()).isEqualTo(SECRET);
        assertThat(new JwtProperties("á".repeat(16), Duration.ofHours(1), "teste").secret()).hasSize(16);
    }

    @Test
    void deveExigirExpiracaoPositiva() {
        for (Duration expiration : new Duration[]{null, Duration.ZERO, Duration.ofSeconds(-1)}) {
            assertThatThrownBy(() -> new JwtProperties(SECRET, expiration, "teste"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("maior que zero");
        }
        assertThat(new JwtProperties(SECRET, Duration.ofSeconds(1), "teste").expiration()).isEqualTo(Duration.ofSeconds(1));
    }

    @Test
    void deveExigirEmissor() {
        for (String issuer : new String[]{null, "", " "}) {
            assertThatThrownBy(() -> new JwtProperties(SECRET, Duration.ofHours(1), issuer))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("issuer");
        }
    }
}
