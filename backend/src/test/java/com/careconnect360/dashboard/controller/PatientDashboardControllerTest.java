package com.careconnect360.dashboard.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
class PatientDashboardControllerTest {

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
    void patientReceivesOnlyOwnInformationAndResponseStaysSafe() throws Exception {
        User ownerUser = saveUser("dash-owner@example.com", UserRole.PATIENT);
        Patient owner = savePatient(ownerUser, "Owner Patient", "5556100001");
        owner.setAddress("100 Main Street");
        patientRepository.save(owner);

        User otherUser = saveUser("dash-other@example.com", UserRole.PATIENT);
        Patient other = savePatient(otherUser, "Other Patient", "5556100002");

        Doctor doctor = saveDoctor(saveUser("dash-doc@example.com", UserRole.DOCTOR), "Dr. Dashboard", true);
        Doctor otherDoctor = saveDoctor(saveUser("dash-doc-other@example.com", UserRole.DOCTOR), "Dr. Other", true);

        InsurancePolicy activePolicy = savePolicy(owner, "POL-DASH-0001", PolicyStatus.ACTIVE);
        savePolicy(other, "POL-DASH-0002", PolicyStatus.ACTIVE);

        saveAppointment(owner, doctor, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(9, 0), "Owner visit", AppointmentStatus.CONFIRMED);
        saveAppointment(other, otherDoctor, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(10, 0), "Other visit", AppointmentStatus.CONFIRMED);

        Claim ownerClaim = saveClaim(
                saveAppointment(owner, doctor, FIXED_NOW.toLocalDate().minusDays(1), LocalTime.of(8, 30), "Owner completed", AppointmentStatus.COMPLETED),
                activePolicy,
                new BigDecimal("150.00"),
                ClaimStatus.APPROVED,
                new BigDecimal("40.00"));
        saveClaim(
                saveAppointment(other, otherDoctor, FIXED_NOW.toLocalDate().minusDays(1), LocalTime.of(11, 30), "Other completed", AppointmentStatus.COMPLETED),
                savePolicy(other, "POL-DASH-0003", PolicyStatus.ACTIVE),
                new BigDecimal("180.00"),
                ClaimStatus.APPROVED,
                new BigDecimal("55.00"));

        savePayment(ownerClaim, PaymentStatus.FAILED, "Bank decline");
        notificationRepository.save(new Notification(ownerUser, NotificationType.SYSTEM, "Owner note", "Owner message", null, null));
        notificationRepository.save(new Notification(otherUser, NotificationType.SYSTEM, "Other note", "Other message", null, null));

        JsonNode body = getPatientDashboard(ownerUser);

        assertEquals(owner.getId().longValue(), body.path("profile").path("patientId").asLong());
        assertEquals("dash-owner@example.com", body.path("profile").path("email").asText());
        assertEquals("POL-DASH-0001", body.path("activePolicy").path("policyNumber").asText());
        assertEquals(1, body.path("upcomingAppointments").size());
        assertEquals("Owner Patient", body.path("recentClaims").get(0).path("patientName").asText());
        assertEquals(1, body.path("recentPayments").size());
        assertEquals(1, body.path("unreadNotificationCount").asInt());

        assertFalse(body.path("profile").has("password"));
        assertFalse(body.path("profile").has("passwordHash"));
        assertFalse(body.path("profile").has("user"));
        assertFalse(body.path("recentClaims").get(0).has("appointment"));
        assertFalse(body.path("recentClaims").get(0).has("patient"));
        assertFalse(body.path("recentClaims").get(0).has("doctor"));
        assertFalse(body.path("recentPayments").get(0).has("jwt"));
    }

    @Test
    void noActivePolicyReturns200WithNullPolicy() throws Exception {
        User patientUser = saveUser("dash-no-policy@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "No Policy", "5556100003");
        savePolicy(patient, "POL-DASH-0004", PolicyStatus.PENDING);

        JsonNode body = getPatientDashboard(patientUser);

        assertTrue(body.has("activePolicy"));
        assertTrue(body.get("activePolicy").isNull());
        assertEquals(0, body.path("upcomingAppointments").size());
    }

    @Test
    void onlyFutureRequestedAndConfirmedAppointmentsAppearAndAreSortedChronologically() throws Exception {
        User patientUser = saveUser("dash-upcoming@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Upcoming Patient", "5556100004");
        Doctor doctor = saveDoctor(saveUser("dash-upcoming-doc@example.com", UserRole.DOCTOR), "Dr. Upcoming", true);

        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate(), LocalTime.of(9, 30), "Past same day", AppointmentStatus.CONFIRMED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(1), LocalTime.of(11, 0), "Past day", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(2), LocalTime.of(13, 0), "Cancelled future", AppointmentStatus.CANCELLED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(2), LocalTime.of(15, 0), "Rejected future", AppointmentStatus.REJECTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(3), LocalTime.of(8, 30), "Completed future", AppointmentStatus.COMPLETED);

        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(9, 0), "Second", AppointmentStatus.CONFIRMED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate(), LocalTime.of(11, 0), "First", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(8, 0), "Third", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(4), LocalTime.of(8, 0), "Fourth", AppointmentStatus.CONFIRMED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(5), LocalTime.of(8, 0), "Fifth", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(6), LocalTime.of(8, 0), "Sixth excluded by limit", AppointmentStatus.CONFIRMED);

        JsonNode body = getPatientDashboard(patientUser);

        assertEquals(5, body.path("upcomingAppointments").size());
        assertEquals("First", body.path("upcomingAppointments").get(0).path("reason").asText());
        assertEquals("Third", body.path("upcomingAppointments").get(1).path("reason").asText());
        assertEquals("Second", body.path("upcomingAppointments").get(2).path("reason").asText());
        assertEquals("Fourth", body.path("upcomingAppointments").get(3).path("reason").asText());
        assertEquals("Fifth", body.path("upcomingAppointments").get(4).path("reason").asText());

        assertEquals("2026-07-13", body.path("upcomingAppointments").get(0).path("appointmentDate").asText());
        assertEquals("11:00:00", body.path("upcomingAppointments").get(0).path("appointmentTime").asText());
    }

    @Test
    void appointmentCountsClaimCountsAndOutstandingResponsibilityAreCorrect() throws Exception {
        User patientUser = saveUser("dash-counts@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Count Patient", "5556100005");
        Doctor doctor = saveDoctor(saveUser("dash-counts-doc@example.com", UserRole.DOCTOR), "Dr. Counts", true);
        InsurancePolicy policy = savePolicy(patient, "POL-DASH-0005", PolicyStatus.ACTIVE);

        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate(), LocalTime.of(11, 0), "Req 1", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(1), LocalTime.of(11, 0), "Req 2", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(2), LocalTime.of(11, 0), "Conf", AppointmentStatus.CONFIRMED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().plusDays(3), LocalTime.of(11, 0), "Cancelled", AppointmentStatus.CANCELLED);
        saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(1), LocalTime.of(11, 0), "Rejected", AppointmentStatus.REJECTED);
        Appointment completedOne = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(2), LocalTime.of(11, 0), "Completed 1", AppointmentStatus.COMPLETED);
        Appointment completedTwo = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(3), LocalTime.of(11, 0), "Completed 2", AppointmentStatus.COMPLETED);
        Appointment completedThree = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(4), LocalTime.of(11, 0), "Completed 3", AppointmentStatus.COMPLETED);
        Appointment completedFour = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(5), LocalTime.of(11, 0), "Completed 4", AppointmentStatus.COMPLETED);
        Appointment completedFive = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(6), LocalTime.of(11, 0), "Completed 5", AppointmentStatus.COMPLETED);

        saveClaim(completedOne, policy, new BigDecimal("100.00"), ClaimStatus.SUBMITTED, null);
        saveClaim(completedTwo, policy, new BigDecimal("110.00"), ClaimStatus.VERIFIED, null);
        Claim approvedUnpaid = saveClaim(completedThree, policy, new BigDecimal("120.00"), ClaimStatus.APPROVED, new BigDecimal("30.00"));
        Claim approvedFailedPayment = saveClaim(completedFour, policy, new BigDecimal("130.00"), ClaimStatus.APPROVED, new BigDecimal("15.00"));
        Claim approvedSuccessfulPayment = saveClaim(completedFive, policy, new BigDecimal("140.00"), ClaimStatus.APPROVED, new BigDecimal("20.00"));
        savePayment(approvedFailedPayment, PaymentStatus.FAILED, "declined");
        savePayment(approvedSuccessfulPayment, PaymentStatus.SUCCESS, null);

        Appointment completedSix = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(7), LocalTime.of(11, 0), "Completed 6", AppointmentStatus.COMPLETED);
        Appointment completedSeven = saveAppointment(patient, doctor, FIXED_NOW.toLocalDate().minusDays(8), LocalTime.of(11, 0), "Completed 7", AppointmentStatus.COMPLETED);
        saveClaim(completedSix, policy, new BigDecimal("150.00"), ClaimStatus.PAID, new BigDecimal("25.00"));
        saveClaim(completedSeven, policy, new BigDecimal("160.00"), ClaimStatus.REJECTED, null);

        JsonNode body = getPatientDashboard(patientUser);
        Map<String, Integer> appointmentCounts = toCountMap(body.path("appointmentCounts"));
        Map<String, Integer> claimCounts = toCountMap(body.path("claimCounts"));

        assertEquals(2, appointmentCounts.get("REQUESTED"));
        assertEquals(1, appointmentCounts.get("CONFIRMED"));
        assertEquals(1, appointmentCounts.get("CANCELLED"));
        assertEquals(1, appointmentCounts.get("REJECTED"));
        assertEquals(7, appointmentCounts.get("COMPLETED"));

        assertEquals(1, claimCounts.get("SUBMITTED"));
        assertEquals(1, claimCounts.get("VERIFIED"));
        assertEquals(3, claimCounts.get("APPROVED"));
        assertEquals(1, claimCounts.get("PAID"));
        assertEquals(1, claimCounts.get("REJECTED"));
        assertEquals(new BigDecimal("45.00"), body.path("outstandingPatientResponsibility").decimalValue().setScale(2));

        assertTrue(paymentRepository.findByClaimId(approvedUnpaid.getId()).isEmpty());
    }

    @Test
    void recentClaimsAndPaymentsAreNewestFirstAndLimited() throws Exception {
        User patientUser = saveUser("dash-recents@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Recent Patient", "5556100006");
        Doctor doctor = saveDoctor(saveUser("dash-recents-doc@example.com", UserRole.DOCTOR), "Dr. Recents", true);
        InsurancePolicy policy = savePolicy(patient, "POL-DASH-0006", PolicyStatus.ACTIVE);

        Long latestClaimId = null;
        Long latestPaymentId = null;
        for (int index = 1; index <= 6; index++) {
            Appointment appointment = saveAppointment(
                    patient,
                    doctor,
                    FIXED_NOW.toLocalDate().minusDays(index),
                    LocalTime.of(8, 0),
                    "Completed " + index,
                    AppointmentStatus.COMPLETED);
            Claim claim = saveClaim(
                    appointment,
                    policy,
                    new BigDecimal("100.00"),
                    ClaimStatus.APPROVED,
                    new BigDecimal(String.format("%d.00", 10 + index)));
            Payment payment = savePayment(
                    claim,
                    index % 2 == 0 ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
                    index % 2 == 0 ? null : "failure-" + index);
            latestClaimId = claim.getId();
            latestPaymentId = payment.getId();
        }

        JsonNode body = getPatientDashboard(patientUser);

        assertEquals(5, body.path("recentClaims").size());
        assertEquals(5, body.path("recentPayments").size());
        assertEquals(latestClaimId.longValue(), body.path("recentClaims").get(0).path("claimId").asLong());
        assertEquals(latestPaymentId.longValue(), body.path("recentPayments").get(0).path("paymentId").asLong());
    }

    @Test
    void emptyPatientDashboardReturnsValidZerosAndEmptyLists() throws Exception {
        User patientUser = saveUser("dash-empty@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Empty Patient", "5556100007");

        JsonNode body = getPatientDashboard(patientUser);

        assertTrue(body.has("activePolicy"));
        assertTrue(body.get("activePolicy").isNull());
        assertEquals(0, body.path("upcomingAppointments").size());
        assertEquals(0, body.path("recentClaims").size());
        assertEquals(0, body.path("recentPayments").size());
        assertEquals(BigDecimal.ZERO.setScale(2), body.path("outstandingPatientResponsibility").decimalValue().setScale(2));
        assertEquals(0, body.path("unreadNotificationCount").asInt());

        Map<String, Integer> appointmentCounts = toCountMap(body.path("appointmentCounts"));
        Map<String, Integer> claimCounts = toCountMap(body.path("claimCounts"));
        appointmentCounts.values().forEach(value -> assertEquals(0, value));
        claimCounts.values().forEach(value -> assertEquals(0, value));
    }

    private JsonNode getPatientDashboard(User user) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/dashboard/patient")
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
        return userRepository.save(new User(
                email,
                "hashed-password",
                role,
                AccountStatus.ACTIVE));
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
                "555910" + user.getId(),
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
                FIXED_NOW.toLocalDate().minusDays(30),
                FIXED_NOW.toLocalDate().plusDays(30));
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
            BigDecimal responsibility = patientResponsibility == null ? new BigDecimal("0.00") : patientResponsibility;
            claim.setApprovedAmount(requestedAmount.subtract(responsibility));
            claim.setPatientResponsibility(responsibility);
        }

        if (status == ClaimStatus.REJECTED) {
            claim.setRejectionReason("Rejected for test setup");
        }

        return claimRepository.save(claim);
    }

    private Payment savePayment(Claim claim, PaymentStatus status, String failureReason) {
        Payment payment = new Payment(
                claim,
                claim.getPatientResponsibility() == null ? new BigDecimal("0.00") : claim.getPatientResponsibility(),
                "CC360-PAY-DASH-" + claim.getId() + "-" + status.name());
        payment.setStatus(status);
        payment.setFailureReason(failureReason);
        if (status == PaymentStatus.SUCCESS) {
            payment.setPaidAt(FIXED_NOW);
        }
        return paymentRepository.save(payment);
    }
}