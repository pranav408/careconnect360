package com.careconnect360.auth.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.careconnect360.auth.dto.LoginRequest;
import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerExceptionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @BeforeEach
    void clearData() {
        notificationRepository.deleteAll();
        paymentRepository.deleteAll();
        claimRepository.deleteAll();
        appointmentRepository.deleteAll();
        doctorRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void badCredentials_returnsUnauthorizedWithStandardErrorPayload() throws Exception {
        User user = new User(
                "user@example.com",
                "$2a$10$abcdefghijklmnopqrstuv",
                UserRole.PATIENT,
                AccountStatus.ACTIVE);
        userRepository.save(user);

        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong-password");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid email or password"))
                .andExpect(jsonPath("$.path").value("/api/auth/login"));
    }

    @Test
    void inactiveOrLockedAccount_returnsForbiddenWithStandardErrorPayload() throws Exception {
        User user = new User(
                "locked@example.com",
                "$2a$10$abcdefghijklmnopqrstuv",
                UserRole.PATIENT,
                AccountStatus.LOCKED);
        userRepository.save(user);

        LoginRequest request = new LoginRequest();
        request.setEmail("locked@example.com");
        request.setPassword("Password123!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("This account is inactive or locked"))
                .andExpect(jsonPath("$.path").value("/api/auth/login"));
    }
}
