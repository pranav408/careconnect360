package com.careconnect360.doctor.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.auth.security.JwtService;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DoctorControllerTest {

    @Autowired
    private MockMvc mockMvc;

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
    void patientCanListDoctors() throws Exception {
        seedDoctor("doctor-alpha@example.com", "Dr. Alpha", "Cardiology", "LIC-100", true);
        seedDoctor("doctor-beta@example.com", "Dr. Beta", "Neurology", "LIC-101", false);
        User patient = saveUser("patient@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].fullName").value("Dr. Alpha"));
    }

    @Test
    void doctorCanListDoctors() throws Exception {
        seedDoctor("doctor-gamma@example.com", "Dr. Gamma", "Orthopedics", "LIC-200", true);
        User doctor = saveUser("doctor@example.com", UserRole.DOCTOR);
        String token = jwtService.generateToken(doctor);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].specialization").value("Orthopedics"));
    }

    @Test
    void adminCanListDoctors() throws Exception {
        seedDoctor("doctor-delta@example.com", "Dr. Delta", "Pediatrics", "LIC-300", true);
        User admin = saveUser("admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(admin);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].licenseNumber").value("LIC-300"));
    }

    @Test
    void noTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/doctors"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void partialNameSearchReturnsMatchingDoctors() throws Exception {
        seedDoctor("doctor-name1@example.com", "Dr. Alice Adams", "Cardiology", "LIC-400", true);
        seedDoctor("doctor-name2@example.com", "Dr. Bob Carter", "Neurology", "LIC-401", true);
        User patient = saveUser("patient-two@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("name", "ali"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fullName").value("Dr. Alice Adams"));
    }

    @Test
    void specializationSearchReturnsMatchingDoctors() throws Exception {
        seedDoctor("doctor-spec1@example.com", "Dr. Clara", "Cardiology", "LIC-500", true);
        seedDoctor("doctor-spec2@example.com", "Dr. Dorian", "Dermatology", "LIC-501", true);
        User patient = saveUser("patient-three@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("specialization", "card"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].specialization").value("Cardiology"));
    }

    @Test
    void availabilityFilterReturnsOnlyAcceptingDoctors() throws Exception {
        seedDoctor("doctor-open@example.com", "Dr. Open", "General", "LIC-600", true);
        seedDoctor("doctor-closed@example.com", "Dr. Closed", "General", "LIC-601", false);
        User patient = saveUser("patient-four@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("available", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fullName").value("Dr. Open"));
    }

    @Test
    void combinedFiltersReturnIntersection() throws Exception {
        seedDoctor("doctor-combo1@example.com", "Dr. Ellie", "Cardiology", "LIC-700", true);
        seedDoctor("doctor-combo2@example.com", "Dr. Eli", "Cardiology", "LIC-701", false);
        seedDoctor("doctor-combo3@example.com", "Dr. Evans", "Dermatology", "LIC-702", true);
        User patient = saveUser("patient-five@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("name", "el")
                .param("specialization", "card")
                .param("available", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].fullName").value("Dr. Ellie"));
    }

    @Test
    void detailEndpointReturnsDoctorProfileResponse() throws Exception {
        Doctor doctor = seedDoctor("doctor-detail@example.com", "Dr. Detail", "Oncology", "LIC-800", true);
        User patient = saveUser("patient-six@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors/{doctorId}", doctor.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doctorId").value(doctor.getId()))
                .andExpect(jsonPath("$.fullName").value("Dr. Detail"))
                .andExpect(jsonPath("$.specialization").value("Oncology"))
                .andExpect(jsonPath("$.licenseNumber").value("LIC-800"))
                .andExpect(jsonPath("$.availableForAppointments").value(true));
    }

    @Test
    void missingDoctorReturnsNotFound() throws Exception {
        User patient = saveUser("patient-seven@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors/999999")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message", containsString("Doctor profile")));
    }

    @Test
    void responseDoesNotExposePasswordHash() throws Exception {
        Doctor doctor = seedDoctor("doctor-safe@example.com", "Dr. Safe", "General", "LIC-900", true);
        User patient = saveUser("patient-eight@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors/{doctorId}", doctor.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist());
    }

    @Test
    void paginationAndSortingAreApplied() throws Exception {
        seedDoctor("doctor-zeta@example.com", "Dr. Zeta", "General", "LIC-1000", true);
        seedDoctor("doctor-alpha@example.com", "Dr. Alpha", "General", "LIC-1001", true);
        seedDoctor("doctor-beta@example.com", "Dr. Beta", "General", "LIC-1002", true);
        User patient = saveUser("patient-nine@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("page", "0")
                .param("size", "2")
                .param("sort", "fullName,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(2)))
                .andExpect(jsonPath("$.content[0].fullName").value("Dr. Alpha"))
                .andExpect(jsonPath("$.content[1].fullName").value("Dr. Beta"))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void invalidPaginationInputReturnsBadRequest() throws Exception {
        User patient = saveUser("patient-ten@example.com", UserRole.PATIENT);
        String token = jwtService.generateToken(patient);

        mockMvc.perform(get("/api/doctors")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

            @Test
            void authenticatedDoctorCanRetrieveOwnProfile() throws Exception {
            User doctorUser = saveUser("doctor-self@example.com", UserRole.DOCTOR);
            Doctor doctor = seedDoctorForUser(doctorUser, "Dr. Self", "Cardiology", "LIC-SELF", true);
            String token = jwtService.generateToken(doctorUser);

            mockMvc.perform(get("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doctorId").value(doctor.getId()))
                .andExpect(jsonPath("$.email").value("doctor-self@example.com"))
                .andExpect(jsonPath("$.fullName").value("Dr. Self"))
                .andExpect(jsonPath("$.specialization").value("Cardiology"))
                .andExpect(jsonPath("$.phone").value("5551234567"))
                .andExpect(jsonPath("$.consultationFee").value(150.00))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"));
            }

            @Test
            void patientAndAdminCannotAccessOwnDoctorProfileEndpoint() throws Exception {
            User patient = saveUser("patient-own@example.com", UserRole.PATIENT);
            User admin = saveUser("admin-own@example.com", UserRole.ADMIN);

            mockMvc.perform(get("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(patient)))
                .andExpect(status().isForbidden());

            mockMvc.perform(get("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(admin)))
                .andExpect(status().isForbidden());
            }

            @Test
            void missingDoctorProfileReturnsNotFoundForAuthenticatedDoctor() throws Exception {
            User doctorUser = saveUser("doctor-missing@example.com", UserRole.DOCTOR);

            mockMvc.perform(get("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(doctorUser)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message", containsString("Doctor profile")));
            }

            @Test
            void validUpdatePersistsEditableFieldsAndIgnoresOwnershipInputs() throws Exception {
            User doctorUser = saveUser("doctor-update@example.com", UserRole.DOCTOR);
            Doctor doctor = seedDoctorForUser(doctorUser, "Dr. Initial", "Neurology", "LIC-UPD", true);
            String originalEmail = doctorUser.getEmail();
            String originalRole = doctorUser.getRole().name();
            String originalStatus = doctorUser.getStatus().name();
            String originalPasswordHash = doctorUser.getPasswordHash();

            String payload = """
                {
                  "doctorId": 999999,
                  "userId": 888888,
                  "email": "hijack@example.com",
                  "role": "ADMIN",
                  "accountStatus": "LOCKED",
                  "password": "NewPassword123!",
                  "fullName": "  Dr. Updated Name  ",
                  "specialization": "  Pediatrics  ",
                  "phone": "  5550001111  ",
                  "consultationFee": 220.00,
                  "available": false
                }
                """;

            mockMvc.perform(put("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(doctorUser))
                .contentType("application/json")
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doctorId").value(doctor.getId()))
                .andExpect(jsonPath("$.email").value(originalEmail))
                .andExpect(jsonPath("$.fullName").value("Dr. Updated Name"))
                .andExpect(jsonPath("$.specialization").value("Pediatrics"))
                .andExpect(jsonPath("$.phone").value("5550001111"))
                .andExpect(jsonPath("$.consultationFee").value(220.00))
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.accountStatus").value(originalStatus));

            Doctor savedDoctor = doctorRepository.findById(doctor.getId()).orElseThrow();
            User savedUser = userRepository.findById(doctorUser.getId()).orElseThrow();

            org.junit.jupiter.api.Assertions.assertEquals("Dr. Updated Name", savedDoctor.getFullName());
            org.junit.jupiter.api.Assertions.assertEquals("Pediatrics", savedDoctor.getSpecialization());
            org.junit.jupiter.api.Assertions.assertEquals("5550001111", savedDoctor.getPhone());
            org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("220.00"), savedDoctor.getConsultationFee());
            org.junit.jupiter.api.Assertions.assertFalse(savedDoctor.isAvailableForAppointments());

            org.junit.jupiter.api.Assertions.assertEquals(originalEmail, savedUser.getEmail());
            org.junit.jupiter.api.Assertions.assertEquals(originalRole, savedUser.getRole().name());
            org.junit.jupiter.api.Assertions.assertEquals(originalStatus, savedUser.getStatus().name());
            org.junit.jupiter.api.Assertions.assertEquals(originalPasswordHash, savedUser.getPasswordHash());
            }

            @Test
            void updateRejectsNegativeConsultationFee() throws Exception {
            User doctorUser = saveUser("doctor-negative@example.com", UserRole.DOCTOR);
            seedDoctorForUser(doctorUser, "Dr. Negative", "General", "LIC-NEG", true);

            String payload = """
                {
                  "fullName": "Dr. Negative",
                  "specialization": "General",
                  "phone": "5552223333",
                  "consultationFee": -1.00,
                  "available": true
                }
                """;

            mockMvc.perform(put("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(doctorUser))
                .contentType("application/json")
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message", containsString("Consultation fee cannot be negative")));
            }

            @Test
            void updateRejectsMissingRequiredFields() throws Exception {
            User doctorUser = saveUser("doctor-required@example.com", UserRole.DOCTOR);
            seedDoctorForUser(doctorUser, "Dr. Required", "General", "LIC-REQ", true);

            String payload = """
                {
                  "fullName": "",
                  "specialization": "General",
                  "phone": "5551234567",
                  "consultationFee": 100.00
                }
                """;

            mockMvc.perform(put("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(doctorUser))
                .contentType("application/json")
                .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));
            }

            @Test
            void ownProfileEndpointsDoNotSerializeSensitiveData() throws Exception {
            User doctorUser = saveUser("doctor-safe-own@example.com", UserRole.DOCTOR);
            seedDoctorForUser(doctorUser, "Dr. Safe Own", "General", "LIC-SAFE-OWN", true);

            mockMvc.perform(get("/api/doctors/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtService.generateToken(doctorUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andExpect(jsonPath("$.jwt").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.entity").doesNotExist());
            }

    private User saveUser(String email, UserRole role) {
        User user = new User(email, "hashed-password", role, AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Doctor seedDoctor(String email, String fullName, String specialization, String licenseNumber, boolean available) {
        User user = saveUser(email, UserRole.DOCTOR);
        Doctor doctor = new Doctor(user, fullName, specialization, licenseNumber, "5551234567", new BigDecimal("150.00"));
        doctor.setClinicAddress("100 Health Avenue");
        doctor.setAvailableForAppointments(available);
        return doctorRepository.save(doctor);
    }

    private Doctor seedDoctorForUser(User user, String fullName, String specialization, String licenseNumber, boolean available) {
        Doctor doctor = new Doctor(user, fullName, specialization, licenseNumber, "5551234567", new BigDecimal("150.00"));
        doctor.setClinicAddress("100 Health Avenue");
        doctor.setAvailableForAppointments(available);
        return doctorRepository.save(doctor);
    }
}
