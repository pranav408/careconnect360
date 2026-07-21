package com.careconnect360.dashboard.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.auth.security.JwtService;
import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.entity.Notification;
import com.careconnect360.notification.enums.NotificationType;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminDashboardControllerTest {

    private static final LocalDateTime FIXED_NOW = LocalDateTime.of(2026, 7, 13, 10, 0);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private ClaimRepository claimRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private InsurancePolicyRepository insurancePolicyRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private Clock clock;

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

        Instant instant = FIXED_NOW.toInstant(ZoneOffset.UTC);
        when(clock.getZone()).thenReturn(ZoneId.of("UTC"));
        when(clock.instant()).thenReturn(instant);
    }

    @Test
    void adminDashboardReturnsAggregatedCountsRecentRecordsAndScaledPaymentTotal() throws Exception {
        User adminUser = saveUser("dash-admin@example.com", UserRole.ADMIN);
        User patientUserOne = saveUser("dash-admin-p1@example.com", UserRole.PATIENT);
        User patientUserTwo = saveUser("dash-admin-p2@example.com", UserRole.PATIENT);
        Patient patientOne = savePatient(patientUserOne, "Patient One", "5556200001");
        Patient patientTwo = savePatient(patientUserTwo, "Patient Two", "5556200002");

        Doctor doctorOne = saveDoctor(saveUser("dash-admin-d1@example.com", UserRole.DOCTOR), "Dr. One", true);
        Doctor doctorTwo = saveDoctor(saveUser("dash-admin-d2@example.com", UserRole.DOCTOR), "Dr. Two", false);

        InsurancePolicy activePolicy = savePolicy(patientOne, "POL-ADMIN-0001", PolicyStatus.ACTIVE);
        InsurancePolicy pendingPolicy = savePolicy(patientOne, "POL-ADMIN-0002", PolicyStatus.PENDING);
        InsurancePolicy rejectedPolicy = savePolicy(patientTwo, "POL-ADMIN-0003", PolicyStatus.REJECTED);
        InsurancePolicy expiredPolicy = savePolicy(patientTwo, "POL-ADMIN-0004", PolicyStatus.EXPIRED);

        Appointment requestedAppointment = saveAppointment(patientOne, doctorOne, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(9, 0), "Requested", AppointmentStatus.REQUESTED);
        Appointment confirmedAppointment = saveAppointment(patientOne, doctorOne, FIXED_NOW.toLocalDate().plusDays(2), LocalTime.of(9, 0), "Confirmed", AppointmentStatus.CONFIRMED);
        Appointment rejectedAppointment = saveAppointment(patientTwo, doctorTwo, FIXED_NOW.toLocalDate().plusDays(3), LocalTime.of(9, 0), "Rejected", AppointmentStatus.REJECTED);
        Appointment cancelledAppointment = saveAppointment(patientTwo, doctorTwo, FIXED_NOW.toLocalDate().plusDays(4), LocalTime.of(9, 0), "Cancelled", AppointmentStatus.CANCELLED);
        Appointment completedAppointment = saveAppointment(patientOne, doctorOne, FIXED_NOW.toLocalDate().minusDays(1), LocalTime.of(9, 0), "Completed", AppointmentStatus.COMPLETED);

        saveClaim(completedAppointment, activePolicy, new BigDecimal("100.00"), ClaimStatus.SUBMITTED, null);
        saveClaim(confirmedAppointment, activePolicy, new BigDecimal("120.00"), ClaimStatus.VERIFIED, null);
        Claim approvedClaim = saveClaim(requestedAppointment, pendingPolicy, new BigDecimal("130.00"), ClaimStatus.APPROVED, new BigDecimal("30.00"));
        saveClaim(rejectedAppointment, rejectedPolicy, new BigDecimal("140.00"), ClaimStatus.REJECTED, null);
        Claim paidClaim = saveClaim(cancelledAppointment, expiredPolicy, new BigDecimal("150.00"), ClaimStatus.PAID, new BigDecimal("25.00"));

        savePayment(approvedClaim, PaymentStatus.SUCCESS, new BigDecimal("30.00"), null);
        savePayment(paidClaim, PaymentStatus.SUCCESS, new BigDecimal("25.00"), null);

        Appointment extraAppointment = null;
        Claim latestClaim = null;
        Payment latestPayment = null;
        for (int index = 1; index <= 4; index++) {
            extraAppointment = saveAppointment(
                    patientOne,
                    doctorOne,
                    FIXED_NOW.toLocalDate().minusDays(2 + index),
                    LocalTime.of(10, 0),
                    "Recent " + index,
                    AppointmentStatus.COMPLETED);
            latestClaim = saveClaim(
                    extraAppointment,
                    activePolicy,
                    new BigDecimal("160.00"),
                    ClaimStatus.APPROVED,
                    new BigDecimal(String.format("%d.00", 10 + index)));
            latestPayment = savePayment(
                    latestClaim,
                    index % 2 == 0 ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
                    new BigDecimal(String.format("%d.00", 10 + index)),
                    index % 2 == 0 ? null : "failure-" + index);
        }

        Notification unreadOne = new Notification(patientUserOne, NotificationType.SYSTEM, "Unread 1", "Unread 1", null, null);
        Notification unreadTwo = new Notification(patientUserTwo, NotificationType.SYSTEM, "Unread 2", "Unread 2", null, null);
        Notification readNotification = new Notification(adminUser, NotificationType.SYSTEM, "Read", "Read", null, null);
        readNotification.setReadStatus(true);
        readNotification.setReadAt(FIXED_NOW);
        notificationRepository.save(unreadOne);
        notificationRepository.save(unreadTwo);
        notificationRepository.save(readNotification);

        JsonNode body = getAdminDashboard(adminUser);
        Map<String, Integer> appointmentCounts = toCountMap(body.path("appointmentCounts"));
        Map<String, Integer> policyCounts = toCountMap(body.path("policyCounts"));
        Map<String, Integer> claimCounts = toCountMap(body.path("claimCounts"));

        assertEquals(2, body.path("totalPatientCount").asInt());
        assertEquals(2, body.path("totalDoctorCount").asInt());
        assertEquals(1, body.path("availableDoctorCount").asInt());
        assertEquals(9, body.path("totalAppointmentCount").asInt());

        assertEquals(1, appointmentCounts.get("REQUESTED"));
        assertEquals(1, appointmentCounts.get("CONFIRMED"));
        assertEquals(1, appointmentCounts.get("REJECTED"));
        assertEquals(1, appointmentCounts.get("CANCELLED"));
        assertEquals(5, appointmentCounts.get("COMPLETED"));

        assertEquals(1, policyCounts.get("PENDING"));
        assertEquals(1, policyCounts.get("ACTIVE"));
        assertEquals(1, policyCounts.get("REJECTED"));
        assertEquals(1, policyCounts.get("EXPIRED"));

        assertEquals(1, claimCounts.get("SUBMITTED"));
        assertEquals(1, claimCounts.get("VERIFIED"));
        assertEquals(5, claimCounts.get("APPROVED"));
        assertEquals(1, claimCounts.get("REJECTED"));
        assertEquals(1, claimCounts.get("PAID"));

        assertEquals(4, body.path("successfulPaymentCount").asInt());
        assertEquals(2, body.path("failedPaymentCount").asInt());
        assertEquals(new BigDecimal("81.00"), body.path("totalSuccessfulPaymentAmount").decimalValue().setScale(2));
        assertEquals(2, body.path("unreadNotificationCount").asInt());
        assertEquals("UNSUPPORTED", body.path("averageSettlementTime").asText());

        assertEquals(5, body.path("recentAppointments").size());
        assertEquals(5, body.path("recentClaims").size());
        assertEquals(4, body.path("recentSuccessfulPayments").size());
        assertEquals(extraAppointment.getId().longValue(), body.path("recentAppointments").get(0).path("appointmentId").asLong());
        assertEquals(latestClaim.getId().longValue(), body.path("recentClaims").get(0).path("claimId").asLong());
        assertEquals(latestPayment.getId().longValue(), body.path("recentSuccessfulPayments").get(0).path("paymentId").asLong());

        assertFalse(body.path("recentClaims").get(0).has("appointment"));
        assertFalse(body.path("recentAppointments").get(0).has("doctor"));
        assertFalse(body.path("recentSuccessfulPayments").get(0).has("user"));
    }

    @Test
    void emptyDatabaseAggregationsReturnZeroRatherThanNull() throws Exception {
        User adminUser = saveUser("dash-admin-empty@example.com", UserRole.ADMIN);

        JsonNode body = getAdminDashboard(adminUser);

        assertEquals(0, body.path("totalPatientCount").asInt());
        assertEquals(0, body.path("totalDoctorCount").asInt());
        assertEquals(0, body.path("availableDoctorCount").asInt());
        assertEquals(0, body.path("totalAppointmentCount").asInt());
        assertEquals(0, body.path("successfulPaymentCount").asInt());
        assertEquals(0, body.path("failedPaymentCount").asInt());
        assertEquals(BigDecimal.ZERO.setScale(2), body.path("totalSuccessfulPaymentAmount").decimalValue().setScale(2));
        assertEquals(0, body.path("unreadNotificationCount").asInt());
        assertEquals(0, body.path("recentAppointments").size());
        assertEquals(0, body.path("recentClaims").size());
        assertEquals(0, body.path("recentSuccessfulPayments").size());
    }

    private JsonNode getAdminDashboard(User user) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/dashboard/admin")
                .header(HttpHeaders.AUTHORIZATION, bearer(user)))
                .andExpect(status().isOk())
                .andReturn();

        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private Map<String, Integer> toCountMap(JsonNode countsNode) {
        Map<String, Integer> counts = new HashMap<>();
        countsNode.forEach(node -> counts.put(node.path("status").asText(), node.path("count").asInt()));
        return counts;
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User saveUser(String email, UserRole role) {
        return userRepository.save(new User(email, "hashed-password", role, AccountStatus.ACTIVE));
    }

    private Patient savePatient(User user, String fullName, String phone) {
        return patientRepository.save(new Patient(user, fullName, phone));
    }

    private Doctor saveDoctor(User user, String fullName, boolean available) {
        Doctor doctor = new Doctor(
                user,
                fullName,
                "General Medicine",
                "LIC-" + Math.abs(user.getEmail().hashCode()),
                "555920" + user.getId(),
                new BigDecimal("150.00"));
        doctor.setClinicAddress("20 Health Avenue");
        doctor.setAvailableForAppointments(available);
        return doctorRepository.save(doctor);
    }

    private InsurancePolicy savePolicy(Patient patient, String policyNumber, PolicyStatus status) {
        InsurancePolicy policy = new InsurancePolicy(
                patient,
                "CareShield",
                policyNumber,
                new BigDecimal("80.00"),
                new BigDecimal("25.00"),
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31));
        policy.setStatus(status);
        return insurancePolicyRepository.save(policy);
    }

    private Appointment saveAppointment(
            Patient patient,
            Doctor doctor,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            String reason,
            AppointmentStatus status) {

        Appointment appointment = new Appointment(patient, doctor, appointmentDate, appointmentTime, reason);
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    private Claim saveClaim(
            Appointment appointment,
            InsurancePolicy policy,
            BigDecimal requestedAmount,
            ClaimStatus status,
            BigDecimal patientResponsibility) {

        Claim claim = new Claim(appointment, policy, requestedAmount);
        claim.setStatus(status);

        if (status == ClaimStatus.APPROVED || status == ClaimStatus.PAID) {
            BigDecimal responsibility = patientResponsibility == null ? BigDecimal.ZERO : patientResponsibility;
            claim.setApprovedAmount(requestedAmount.subtract(responsibility));
            claim.setPatientResponsibility(responsibility);
        }

        if (status == ClaimStatus.REJECTED) {
            claim.setRejectionReason("Rejected for test setup");
        }

        return claimRepository.save(claim);
    }

    private Payment savePayment(
            Claim claim,
            PaymentStatus status,
            BigDecimal amount,
            String failureReason) {

        Payment payment = new Payment(
                claim,
                amount,
                "CC360-PAY-ADMIN-" + claim.getId() + "-" + status.name() + "-" + System.nanoTime());
        payment.setStatus(status);
        payment.setFailureReason(failureReason);
        if (status == PaymentStatus.SUCCESS) {
            payment.setPaidAt(FIXED_NOW);
        }
        return paymentRepository.save(payment);
    }
}