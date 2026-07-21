package com.careconnect360.config;

import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;

@Component
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

    @Override
    @Transactional
    public void run(String... args) {

        String normalizedEmail = adminEmail
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {

            LOGGER.info(
                    "Default administrator already exists: {}",
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
                "Default administrator created successfully: {}",
                normalizedEmail);
    }
}