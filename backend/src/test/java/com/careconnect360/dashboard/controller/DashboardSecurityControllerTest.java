package com.careconnect360.dashboard.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DashboardSecurityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private InsurancePolicyRepository insurancePolicyRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

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
    void unauthenticatedDashboardEndpointsReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/dashboard/patient"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/dashboard/admin"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patientCannotAccessAdminDashboard() throws Exception {
        User patientUser = saveUser("dash-security-patient@example.com", UserRole.PATIENT);
        patientRepository.save(new Patient(patientUser, "Patient", "5556300001"));

        mockMvc.perform(get("/api/dashboard/admin")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCannotAccessPatientDashboard() throws Exception {
        User adminUser = saveUser("dash-security-admin@example.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/dashboard/patient")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void doctorCannotAccessEitherRestrictedDashboard() throws Exception {
        User doctorUser = saveUser("dash-security-doctor@example.com", UserRole.DOCTOR);

        mockMvc.perform(get("/api/dashboard/patient")
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/dashboard/admin")
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isForbidden());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User saveUser(String email, UserRole role) {
        return userRepository.save(new User(email, "hashed-password", role, AccountStatus.ACTIVE));
    }
}