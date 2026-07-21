package com.careconnect360.auth.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Locale;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.patient.enums.Gender;
import com.careconnect360.payment.repository.PaymentRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(AuthenticatedUserServiceTest.TestAuthenticatedUserController.class)
class AuthenticatedUserServiceTest {

    @Autowired
    private AuthenticatedUserService authenticatedUserService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private InsurancePolicyRepository insurancePolicyRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private MockMvc mockMvc;

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
    void authenticatedPatient_resolvesUserAndPatient() {
        User user = saveUser("Patient.User@Example.com", UserRole.PATIENT);
        Patient patient = savePatient(user, "Patient User");

        Authentication authentication = authenticationFor(user.getEmail(), UserRole.PATIENT);

        User resolvedUser = authenticatedUserService.getCurrentUser(authentication);
        Patient resolvedPatient = authenticatedUserService.getCurrentPatient(authentication);

        assertNotNull(resolvedUser);
        assertEquals(user.getId(), resolvedUser.getId());
        assertEquals(patient.getId(), resolvedPatient.getId());
    }

    @Test
    void authenticatedDoctor_resolvesUserAndDoctor() {
        User user = saveUser("Doctor.User@Example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(user, "Doctor User");

        Authentication authentication = authenticationFor(user.getEmail(), UserRole.DOCTOR);

        User resolvedUser = authenticatedUserService.getCurrentUser(authentication);
        Doctor resolvedDoctor = authenticatedUserService.getCurrentDoctor(authentication);

        assertNotNull(resolvedUser);
        assertEquals(user.getId(), resolvedUser.getId());
        assertEquals(doctor.getId(), resolvedDoctor.getId());
    }

    @Test
    void adminCannotResolveAsPatient() {
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        Authentication authentication = authenticationFor(admin.getEmail(), UserRole.ADMIN);

        ForbiddenOperationException exception = assertThrows(
                ForbiddenOperationException.class,
                () -> authenticatedUserService.getCurrentPatient(authentication));

        assertEquals("Only patient users can resolve a patient profile", exception.getMessage());
    }

    @Test
    void patientCannotResolveAsDoctor() {
        User patient = saveUser("patient@example.com", UserRole.PATIENT);
        Authentication authentication = authenticationFor(patient.getEmail(), UserRole.PATIENT);

        ForbiddenOperationException exception = assertThrows(
                ForbiddenOperationException.class,
                () -> authenticatedUserService.getCurrentDoctor(authentication));

        assertEquals("Only doctor users can resolve a doctor profile", exception.getMessage());
    }

    @Test
    @WithMockUser(username = "patient-no-profile@example.com", roles = {"PATIENT"})
    void missingLinkedProfile_returns404ThroughExceptionContract() throws Exception {
        User patientUser = saveUser("patient-no-profile@example.com", UserRole.PATIENT);

        mockMvc.perform(get("/test/authenticated-user/patient"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Patient profile was not found for the authenticated user"))
                .andExpect(jsonPath("$.path").value("/test/authenticated-user/patient"));
    }

    @Test
    void missingAuthentication_isRejected() {
        AccessDeniedException exception = assertThrows(
                AccessDeniedException.class,
                () -> authenticatedUserService.getCurrentUser(null));

        assertEquals("Authentication is required", exception.getMessage());
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(
                email.trim().toLowerCase(Locale.ROOT),
                "$2a$10$abcdefghijklmnopqrstuv",
                role,
                AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Patient savePatient(User user, String fullName) {
        Patient patient = new Patient(user, fullName, "5551234567");
        patient.setGender(Gender.MALE);
        return patientRepository.save(patient);
    }

    private Doctor saveDoctor(User user, String fullName) {
        Doctor doctor = new Doctor(
                user,
                fullName,
                "Cardiology",
                "LIC-111",
                "5557654321",
                new java.math.BigDecimal("150.00"));
        return doctorRepository.save(doctor);
    }

    private Authentication authenticationFor(String email, UserRole role) {
        return new UsernamePasswordAuthenticationToken(
                email,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
    }

    @RestController
    @RequestMapping("/test/authenticated-user")
    static class TestAuthenticatedUserController {

        private final AuthenticatedUserService authenticatedUserService;

        TestAuthenticatedUserController(AuthenticatedUserService authenticatedUserService) {
            this.authenticatedUserService = authenticatedUserService;
        }

        @GetMapping("/patient")
        public ResponseEntity<Patient> getPatient(Authentication authentication) {
            Patient patient = authenticatedUserService.getCurrentPatient(authentication);
            return ResponseEntity.ok(patient);
        }
    }
}
