package com.careconnect360.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.context.assertj.AssertableApplicationContext;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;

class AdminDataInitializerBootstrapTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(AdminDataInitializer.class, TestBeans.class);

    @Test
    void initializerBeanIsAbsentWhenBootstrapDisabled() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=false")
                .run(context -> assertThat(context).doesNotHaveBean(AdminDataInitializer.class));
    }

    @Test
    void initializerRunsWhenBootstrapEnabledWithValidProperties() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=true",
                        "app.admin.email=admin-bootstrap@example.com",
                        "app.admin.password=StrongPass123!")
                .run(context -> {
                    assertThat(context).hasSingleBean(AdminDataInitializer.class);

                    AdminDataInitializer initializer = context.getBean(AdminDataInitializer.class);
                    UserRepository userRepository = context.getBean(UserRepository.class);
                    PasswordEncoder passwordEncoder = context.getBean(PasswordEncoder.class);

                    when(userRepository.existsByEmailIgnoreCase("admin-bootstrap@example.com"))
                            .thenReturn(false);
                    when(passwordEncoder.encode("StrongPass123!"))
                            .thenReturn("hashed-password");

                    initializer.run();

                    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
                    verify(userRepository).save(userCaptor.capture());
                    assertThat(userCaptor.getValue().getEmail()).isEqualTo("admin-bootstrap@example.com");
                    assertThat(userCaptor.getValue().getRole()).isEqualTo(UserRole.ADMIN);
                    assertThat(userCaptor.getValue().getPasswordHash()).isEqualTo("hashed-password");
                });
    }

    @Test
    void existingAdministratorIsNotDuplicated() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=true",
                        "app.admin.email=admin-existing@example.com",
                        "app.admin.password=StrongPass123!")
                .run(context -> {
                    AdminDataInitializer initializer = context.getBean(AdminDataInitializer.class);
                    UserRepository userRepository = context.getBean(UserRepository.class);

                    when(userRepository.existsByEmailIgnoreCase("admin-existing@example.com"))
                            .thenReturn(true);

                    initializer.run();

                    verify(userRepository, never()).save(any(User.class));
                });
    }

    @Test
    void missingBootstrapEmailFailsClearly() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=true",
                        "app.admin.email=",
                        "app.admin.password=StrongPass123!")
                .run(this::assertStartupFailureContainsEmailMessage);
    }

    @Test
    void missingBootstrapPasswordFailsClearly() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=true",
                        "app.admin.email=admin-missing-password@example.com",
                        "app.admin.password=")
                .run(context -> {
                    assertThat(context).hasFailed();
                    assertThat(context.getStartupFailure())
                                                        .hasRootCauseMessage("Administrator bootstrap requires nonblank ADMIN_PASSWORD when app.admin.bootstrap.enabled=true");
                });
    }

    @Test
    void passwordValidationMessageDoesNotLeakProvidedPassword() {
        contextRunner
                .withPropertyValues(
                        "app.admin.bootstrap.enabled=true",
                        "app.admin.email=admin-short-password@example.com",
                        "app.admin.password=short")
                .run(context -> {
                    AdminDataInitializer initializer = context.getBean(AdminDataInitializer.class);
                    UserRepository userRepository = context.getBean(UserRepository.class);

                    when(userRepository.existsByEmailIgnoreCase("admin-short-password@example.com"))
                            .thenReturn(false);

                    assertThatThrownBy(initializer::run)
                            .isInstanceOf(IllegalStateException.class)
                            .hasMessageContaining("between 8 and 72")
                            .hasMessageNotContaining("short");
                });
    }

    private void assertStartupFailureContainsEmailMessage(AssertableApplicationContext context) {
        assertThat(context).hasFailed();
        assertThat(context.getStartupFailure())
                                .hasRootCauseMessage("Administrator bootstrap requires nonblank ADMIN_EMAIL when app.admin.bootstrap.enabled=true");
    }

    @Configuration
    static class TestBeans {

        @Bean
        UserRepository userRepository() {
            return mock(UserRepository.class);
        }

        @Bean
        PasswordEncoder passwordEncoder() {
            return mock(PasswordEncoder.class);
        }
    }
}
