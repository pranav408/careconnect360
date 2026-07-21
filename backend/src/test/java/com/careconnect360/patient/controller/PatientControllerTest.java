package com.careconnect360.patient.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.Map;

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
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.enums.Gender;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PatientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
                                notificationRepository.deleteAll();
                                paymentRepository.deleteAll();
                                claimRepository.deleteAll();
                                appointmentRepository.deleteAll();
                                insurancePolicyRepository.deleteAll();
                                doctorRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void authenticatedPatientCanRetrieveOwnProfile() throws Exception {
        User patientUser = saveUser("patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Example Patient", "5551234567");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId").value(patient.getId()))
                .andExpect(jsonPath("$.email").value("patient@example.com"))
                .andExpect(jsonPath("$.fullName").value("Example Patient"))
                .andExpect(jsonPath("$.phone").value("5551234567"))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    void authenticatedPatientCanUpdateOwnProfile() throws Exception {
        User patientUser = saveUser("patient-update@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Old Name", "5551111111");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = Map.of(
                "fullName", "Updated Name",
                "phone", "5552222222",
                "address", "100 Main St",
                "dateOfBirth", "1990-01-15",
                "gender", "FEMALE");

        mockMvc.perform(put("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.patientId").value(patient.getId()))
                .andExpect(jsonPath("$.fullName").value("Updated Name"))
                .andExpect(jsonPath("$.phone").value("5552222222"))
                .andExpect(jsonPath("$.address").value("100 Main St"))
                .andExpect(jsonPath("$.dateOfBirth").value("1990-01-15"))
                .andExpect(jsonPath("$.gender").value("FEMALE"));

        Patient updated = patientRepository.findById(patient.getId()).orElseThrow();
        assertEquals("Updated Name", updated.getFullName());
        assertEquals("5552222222", updated.getPhone());
        assertEquals("100 Main St", updated.getAddress());
        assertEquals(LocalDate.of(1990, 1, 15), updated.getDateOfBirth());
        assertEquals(Gender.FEMALE, updated.getGender());
    }

    @Test
    void responseDoesNotExposePasswordOrPasswordHash() throws Exception {
        User patientUser = saveUser("patient-safe@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Safe Patient", "5553333333");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist());
    }

    @Test
    void patientCannotChangeEmailRoleStatusOrIds() throws Exception {
        User patientUser = saveUser("patient-locked@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Immutable Patient", "5554444444");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = Map.of(
                "fullName", "Updated Again",
                "phone", "5555555555",
                "email", "changed@example.com",
                "role", "DOCTOR",
                "status", "INACTIVE",
                "patientId", 999L,
                "userId", 999L);

        mockMvc.perform(put("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("patient-locked@example.com"))
                .andExpect(jsonPath("$.fullName").value("Updated Again"));

        User persistedUser = userRepository.findById(patientUser.getId()).orElseThrow();
        assertEquals("patient-locked@example.com", persistedUser.getEmail());
        assertEquals(UserRole.PATIENT, persistedUser.getRole());
        assertEquals(AccountStatus.ACTIVE, persistedUser.getStatus());
        assertEquals(patient.getId(), patientRepository.findById(patient.getId()).orElseThrow().getId());
    }

    @Test
    void noTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/patients/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void doctorTokenReturnsForbidden() throws Exception {
        User doctorUser = saveUser("doctor@example.com", UserRole.DOCTOR);
        String token = jwtService.generateToken(doctorUser);

        mockMvc.perform(get("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminTokenReturnsForbidden() throws Exception {
        User adminUser = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void missingLinkedPatientProfileReturnsNotFound() throws Exception {
        User patientUser = saveUser("orphan@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message", containsString("Patient profile")));
    }

    @Test
    void invalidRequestReturnsBadRequest() throws Exception {
        User patientUser = saveUser("patient-invalid@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Patient Invalid", "5556666666");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = Map.of(
                "fullName", " ",
                "phone", " ");

        mockMvc.perform(put("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message", notNullValue()));
    }

    @Test
    void updateProfilePersistsChangesToDatabase() throws Exception {
        User patientUser = saveUser("patient-persist@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Persist Name", "5557777777");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = Map.of(
                "fullName", "Persisted Name",
                "phone", "5558888888");

        mockMvc.perform(put("/api/patients/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        Patient persisted = patientRepository.findById(patient.getId()).orElseThrow();
        assertEquals("Persisted Name", persisted.getFullName());
        assertEquals("5558888888", persisted.getPhone());
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(
                email,
                "hashed-password",
                role,
                AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Patient savePatient(User user, String fullName, String phone) {
        Patient patient = new Patient(user, fullName, phone);
        return patientRepository.save(patient);
    }
}
