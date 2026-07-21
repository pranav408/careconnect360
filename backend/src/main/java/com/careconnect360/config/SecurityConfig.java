package com.careconnect360.config;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.careconnect360.auth.security.CustomUserDetailsService;
import com.careconnect360.auth.security.JwtAuthenticationFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final CustomUserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final String allowedOriginsProperty;

    public SecurityConfig(
            CustomUserDetailsService userDetailsService,
            JwtAuthenticationFilter jwtAuthenticationFilter,
            @Value("${app.cors.allowed-origins:}") String allowedOriginsProperty) {

        this.userDetailsService = userDetailsService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.allowedOriginsProperty = allowedOriginsProperty;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationProvider authenticationProvider) {

        return new ProviderManager(
                List.of(authenticationProvider));
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthenticationProvider authenticationProvider)
            throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS))

            .authenticationProvider(authenticationProvider)

            .authorizeHttpRequests(auth -> auth

                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/register/patient",
                    "/api/auth/login"
                ).permitAll()

                .requestMatchers(
                    "/api/public/**",
                    "/actuator/health",
                    "/actuator/health/**",
                    "/actuator/info",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**",
                    "/error"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()

                .anyRequest().authenticated()
            )

            .exceptionHandling(exception -> exception

                .authenticationEntryPoint(
                    (request, response, authException) ->
                        response.sendError(
                            HttpServletResponse.SC_UNAUTHORIZED,
                            "Authentication is required"))

                .accessDeniedHandler(
                    (request, response, accessDeniedException) ->
                        response.sendError(
                            HttpServletResponse.SC_FORBIDDEN,
                            "Access is denied"))
            )

            .addFilterBefore(
                jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class)

            .httpBasic(httpBasic -> httpBasic.disable())
            .formLogin(formLogin -> formLogin.disable());

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(parseAllowedOrigins(allowedOriginsProperty));

        configuration.setAllowedMethods(
                List.of(
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ));

        configuration.setAllowedHeaders(
                List.of(
                    "Authorization",
                    "Content-Type",
                    "Accept",
                    "Origin",
                    "X-Requested-With"
                ));

            configuration.setAllowCredentials(false);
            configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration);

        return source;
    }

    private List<String> parseAllowedOrigins(String configuredOrigins) {

        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            return List.of();
        }

        Set<String> deduplicatedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .filter(origin -> !"*".equals(origin))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        return List.copyOf(deduplicatedOrigins);
    }
}