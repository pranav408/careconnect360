package com.careconnect360.config;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;

import jakarta.annotation.PostConstruct;

@Component
@ConditionalOnProperty(
        prefix = "app.admin.bootstrap",
        name = "enabled",
        havingValue = "true",
        matchIfMissing = false)
public class AdminDataInitializer implements CommandLineRunner {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(AdminDataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminDataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email}") String adminEmail,
            @Value("${app.admin.password}") String adminPassword) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

        @PostConstruct
        void validateRequiredConfiguration() {

                if (adminEmail == null || adminEmail.isBlank()) {
                        throw new IllegalStateException(
                                        "Administrator bootstrap requires nonblank ADMIN_EMAIL when app.admin.bootstrap.enabled=true");
                }

                if (adminPassword == null || adminPassword.isBlank()) {
                        throw new IllegalStateException(
                                        "Administrator bootstrap requires nonblank ADMIN_PASSWORD when app.admin.bootstrap.enabled=true");
                }
        }

    @Override
    @Transactional
    public void run(String... args) {

        String normalizedEmail = adminEmail
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {

            LOGGER.info(
                                        "Administrator already exists, skipping bootstrap create: {}",
                    normalizedEmail);

            return;
        }

        if (adminPassword == null
                || adminPassword.length() < 8
                || adminPassword.length() > 72) {

            throw new IllegalStateException(
                    "Administrator password must contain between 8 and 72 characters");
        }

        User administrator = new User(
                normalizedEmail,
                passwordEncoder.encode(adminPassword),
                UserRole.ADMIN,
                AccountStatus.ACTIVE);

        userRepository.save(administrator);

        LOGGER.info(
                "Administrator bootstrap account created successfully: {}",
                normalizedEmail);
    }
}