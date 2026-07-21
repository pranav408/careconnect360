package com.careconnect360.doctor.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.auth.security.JwtService;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.doctor.dto.CreateDoctorRequest;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminDoctorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DoctorRepository doctorRepository;

        @Autowired
        private ClaimRepository claimRepository;

        @Autowired
        private InsurancePolicyRepository insurancePolicyRepository;

        @Autowired
        private AppointmentRepository appointmentRepository;

        @Autowired
        private PatientRepository patientRepository;

        @Autowired
        private PaymentRepository paymentRepository;

        @Autowired
        private NotificationRepository notificationRepository;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
                notificationRepository.deleteAll();
                paymentRepository.deleteAll();
                claimRepository.deleteAll();
                insurancePolicyRepository.deleteAll();
                appointmentRepository.deleteAll();
        doctorRepository.deleteAll();
                patientRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void noJwt_returnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/admin/doctors")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest(
                        "admin-create@example.com",
                        "LIC-001"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patientJwt_returnsForbidden() throws Exception {
        User patient = saveUser("patient@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest(
                        "doctor-patient@example.com",
                        "LIC-101"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminJwt_returnsCreated() throws Exception {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest(
                        "doctor-admin@example.com",
                        "LIC-201"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("doctor-admin@example.com"))
                .andExpect(jsonPath("$.role").value("DOCTOR"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.message").value("Doctor account created successfully"));
    }

    @Test
    void duplicateEmail_returnsConflictWithStandardErrorPayload() throws Exception {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        CreateDoctorRequest firstRequest = buildRequest(
                "duplicate@example.com",
                "LIC-301");
        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        CreateDoctorRequest duplicateEmailRequest = buildRequest(
                "duplicate@example.com",
                "LIC-302");
        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateEmailRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value(containsString("email")))
                .andExpect(jsonPath("$.path").value("/api/admin/doctors"));
    }

    @Test
    void duplicateLicense_returnsConflict() throws Exception {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        CreateDoctorRequest firstRequest = buildRequest(
                "first-license@example.com",
                "LIC-401");
        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(firstRequest)))
                .andExpect(status().isCreated());

        CreateDoctorRequest duplicateLicenseRequest = buildRequest(
                "second-license@example.com",
                "LIC-401");
        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicateLicenseRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value(containsString("license")));
    }

    @Test
    void invalidRequest_returnsBadRequest() throws Exception {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        CreateDoctorRequest invalidRequest = new CreateDoctorRequest();
        invalidRequest.setEmail("not-an-email");
        invalidRequest.setPassword("short");
        invalidRequest.setFullName(" ");
        invalidRequest.setSpecialization("Cardiology");
        invalidRequest.setLicenseNumber("LIC-501");
        invalidRequest.setPhone("5551234567");
        invalidRequest.setConsultationFee(new BigDecimal("150.00"));

        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.path").value("/api/admin/doctors"));
    }

    @Test
    void transactionCreatesLinkedUserAndDoctorRecords() throws Exception {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        mockMvc.perform(post("/api/admin/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildRequest(
                        "linked@example.com",
                        "LIC-501"))))
                .andExpect(status().isCreated());

        long userCount = userRepository.count();
        long doctorCount = doctorRepository.count();

        assertEquals(2L, userCount, "expected one doctor user plus one admin user");
        assertEquals(1L, doctorCount, "expected one doctor profile");
    }

    private CreateDoctorRequest buildRequest(String email, String licenseNumber) {
        CreateDoctorRequest request = new CreateDoctorRequest();
        request.setEmail(email);
        request.setPassword("SecurePass123!");
        request.setFullName("Dr. Test User");
        request.setSpecialization("Cardiology");
        request.setLicenseNumber(licenseNumber);
        request.setPhone("5551234567");
        request.setClinicAddress("100 Health Avenue");
        request.setConsultationFee(new BigDecimal("150.00"));
        return request;
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(
                email,
                "hashed-password",
                role,
                AccountStatus.ACTIVE);
        return userRepository.save(user);
    }
}
