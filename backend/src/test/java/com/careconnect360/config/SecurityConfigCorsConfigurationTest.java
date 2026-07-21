package com.careconnect360.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.careconnect360.auth.security.CustomUserDetailsService;
import com.careconnect360.auth.security.JwtAuthenticationFilter;

class SecurityConfigCorsConfigurationTest {

    @Test
    void corsConfigurationAllowsLocalOriginsAndRejectsUnlistedOrigins() {
        SecurityConfig securityConfig = new SecurityConfig(
                mock(CustomUserDetailsService.class),
                mock(JwtAuthenticationFilter.class),
                "http://localhost:5173, http://127.0.0.1:5173, ,http://localhost:5173,*");

        UrlBasedCorsConfigurationSource source =
                (UrlBasedCorsConfigurationSource) securityConfig.corsConfigurationSource();

        CorsConfiguration corsConfiguration = source.getCorsConfiguration(
                new MockHttpServletRequest("OPTIONS", "/api/auth/login"));

        assertThat(corsConfiguration).isNotNull();
        assertThat(corsConfiguration.getAllowedOrigins())
                .containsExactly("http://localhost:5173", "http://127.0.0.1:5173");
        assertThat(corsConfiguration.checkOrigin("http://localhost:5173"))
                .isEqualTo("http://localhost:5173");
        assertThat(corsConfiguration.checkOrigin("http://127.0.0.1:5173"))
                .isEqualTo("http://127.0.0.1:5173");
        assertThat(corsConfiguration.checkOrigin("http://unlisted.example.com")).isNull();
    }

    @Test
    void corsConfigurationAllowsOptionsDisablesCredentialsAndAllowsAuthorizationHeader() {
        SecurityConfig securityConfig = new SecurityConfig(
                mock(CustomUserDetailsService.class),
                mock(JwtAuthenticationFilter.class),
                "http://localhost:5173,http://127.0.0.1:5173");

        UrlBasedCorsConfigurationSource source =
                (UrlBasedCorsConfigurationSource) securityConfig.corsConfigurationSource();

        CorsConfiguration corsConfiguration = source.getCorsConfiguration(
                new MockHttpServletRequest("OPTIONS", "/api/patient/profile"));

        assertThat(corsConfiguration).isNotNull();
        assertThat(corsConfiguration.getAllowedMethods())
                .contains("OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE");
        assertThat(corsConfiguration.getAllowCredentials()).isFalse();
        assertThat(corsConfiguration.getAllowedHeaders()).containsAll(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With"));
        assertThat(corsConfiguration.getMaxAge()).isEqualTo(3600L);
    }
}
