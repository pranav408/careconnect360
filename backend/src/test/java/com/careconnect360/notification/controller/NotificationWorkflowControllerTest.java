package com.careconnect360.notification.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
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
import com.careconnect360.notification.enums.EmailDeliveryStatus;
import com.careconnect360.notification.enums.NotificationType;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationWorkflowControllerTest {

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
    void bookingCreatesAppointmentRequestedNotification() throws Exception {
        User patientUser = saveUser("notif-book-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Book Patient", "5558000001");
        Doctor doctor = saveDoctor(saveUser("notif-book-doctor@example.com", UserRole.DOCTOR), "Dr. Sarah Johnson", new BigDecimal("120.00"));

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "doctorId", doctor.getId(),
                        "appointmentDate", LocalDate.now().plusDays(2).toString(),
                        "appointmentTime", "11:00:00",
                        "reason", "Routine check-up"))))
                .andExpect(status().isCreated());

        Notification latest = latestNotification(patientUser);
        assertEquals(NotificationType.APPOINTMENT_REQUESTED, latest.getType());
        assertEquals("Appointment Requested", latest.getTitle());
        assertTrue(latest.getMessage().contains("Dr. Sarah Johnson"));
        assertEquals(EmailDeliveryStatus.NOT_REQUESTED, latest.getEmailDeliveryStatus());
    }

    @Test
    void confirmationCreatesAppointmentConfirmedNotification() throws Exception {
        User patientUser = saveUser("notif-confirm-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Confirm Patient", "5558000002");
        User doctorUser = saveUser("notif-confirm-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Confirm", new BigDecimal("130.00"));
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(3),
                LocalTime.of(10, 30),
                "Consult",
                AppointmentStatus.REQUESTED);

        mockMvc.perform(patch("/api/doctor/appointments/{id}/confirm", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isOk());

        Notification latest = latestNotification(patientUser);
        assertEquals(NotificationType.APPOINTMENT_CONFIRMED, latest.getType());
    }

    @Test
    void rejectionCreatesAppointmentRejectedNotification() throws Exception {
        User patientUser = saveUser("notif-reject-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Reject Patient", "5558000003");
        User doctorUser = saveUser("notif-reject-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Reject", new BigDecimal("130.00"));
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(3),
                LocalTime.of(9, 15),
                "Consult",
                AppointmentStatus.REQUESTED);

        mockMvc.perform(patch("/api/doctor/appointments/{id}/reject", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isOk());

        Notification latest = latestNotification(patientUser);
        assertEquals(NotificationType.APPOINTMENT_REJECTED, latest.getType());
    }

    @Test
    void cancellationCreatesAppointmentCancelledNotification() throws Exception {
        User patientUser = saveUser("notif-cancel-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Cancel Patient", "5558000004");
        Doctor doctor = saveDoctor(saveUser("notif-cancel-doctor@example.com", UserRole.DOCTOR), "Dr. Cancel", new BigDecimal("130.00"));
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(4),
                LocalTime.of(14, 0),
                "Consult",
                AppointmentStatus.CONFIRMED);

        mockMvc.perform(patch("/api/appointments/{id}/cancel", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk());

        Notification latest = latestNotification(patientUser);
        assertEquals(NotificationType.APPOINTMENT_CANCELLED, latest.getType());
    }

    @Test
    void completionCreatesAppointmentCompletedAndClaimSubmittedNotifications() throws Exception {
        User patientUser = saveUser("notif-complete-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Complete Patient", "5558000005");
        User doctorUser = saveUser("notif-complete-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Complete", new BigDecimal("150.00"));

        savePolicy(
                patient,
                "POL-NOTIF-0001",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(30),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(13, 30),
                "Complete",
                AppointmentStatus.CONFIRMED);

        mockMvc.perform(patch("/api/doctor/appointments/{id}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isOk());

        assertEquals(1L, countByTypeAndRecipient(NotificationType.APPOINTMENT_COMPLETED, patientUser));
        assertEquals(1L, countByTypeAndRecipient(NotificationType.CLAIM_SUBMITTED, patientUser));
    }

    @Test
    void verifyCreatesClaimVerifiedNotification() throws Exception {
        User adminUser = saveUser("notif-verify-admin@example.com", UserRole.ADMIN);
        User patientUser = saveUser("notif-verify-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Verify Patient", "5558000006");
        Doctor doctor = saveDoctor(saveUser("notif-verify-doctor@example.com", UserRole.DOCTOR), "Dr. Verify", new BigDecimal("140.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0002",
                new BigDecimal("80.00"),
                new BigDecimal("20.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(10, 0), "Verify", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("140.00"),
                ClaimStatus.SUBMITTED);

        mockMvc.perform(patch("/api/admin/claims/{id}/verify", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isOk());

        assertEquals(1L, countByTypeAndRecipient(NotificationType.CLAIM_VERIFIED, patientUser));
    }

    @Test
    void approveCreatesClaimApprovedNotification() throws Exception {
        User adminUser = saveUser("notif-approve-admin@example.com", UserRole.ADMIN);
        User patientUser = saveUser("notif-approve-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Approve Patient", "5558000007");
        Doctor doctor = saveDoctor(saveUser("notif-approve-doctor@example.com", UserRole.DOCTOR), "Dr. Approve", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0003",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(11, 0), "Approve", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("150.00"),
                ClaimStatus.VERIFIED);

        mockMvc.perform(patch("/api/admin/claims/{id}/approve", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isOk());

        Notification latest = findLatestByType(patientUser, NotificationType.CLAIM_APPROVED);
        assertNotNull(latest);
        assertTrue(latest.getMessage().contains("$"));
    }

    @Test
    void rejectionCreatesClaimRejectedNotification() throws Exception {
        User adminUser = saveUser("notif-rej-admin@example.com", UserRole.ADMIN);
        User patientUser = saveUser("notif-rej-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Reject Claim Patient", "5558000008");
        Doctor doctor = saveDoctor(saveUser("notif-rej-doctor@example.com", UserRole.DOCTOR), "Dr. Reject Claim", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0004",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(12, 0), "Reject", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("150.00"),
                ClaimStatus.VERIFIED);

        mockMvc.perform(patch("/api/admin/claims/{id}/reject", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Coverage prerequisites were not met"))))
                .andExpect(status().isOk());

        assertEquals(1L, countByTypeAndRecipient(NotificationType.CLAIM_REJECTED, patientUser));
    }

    @Test
    void successfulPaymentCreatesPaymentSuccessAndClaimPaidNotifications() throws Exception {
        User patientUser = saveUser("notif-pay-success-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Pay Success Patient", "5558000009");
        Doctor doctor = saveDoctor(saveUser("notif-pay-success-doctor@example.com", UserRole.DOCTOR), "Dr. Pay", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0005",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(13, 0), "Pay success", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("150.00"),
                ClaimStatus.APPROVED);
        claim.setApprovedAmount(new BigDecimal("80.00"));
        claim.setPatientResponsibility(new BigDecimal("70.00"));
        claimRepository.save(claim);

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"));

        assertEquals(1L, countByTypeAndRecipient(NotificationType.PAYMENT_SUCCESS, patientUser));
        assertEquals(1L, countByTypeAndRecipient(NotificationType.CLAIM_PAID, patientUser));
    }

    @Test
    void failedPaymentCreatesPaymentFailedButNotClaimPaidNotification() throws Exception {
        User patientUser = saveUser("notif-pay-failed-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Pay Failed Patient", "5558000010");
        Doctor doctor = saveDoctor(saveUser("notif-pay-failed-doctor@example.com", UserRole.DOCTOR), "Dr. Pay Failed", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0006",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(14, 0), "Pay failed", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("150.00"),
                ClaimStatus.APPROVED);
        claim.setApprovedAmount(new BigDecimal("80.00"));
        claim.setPatientResponsibility(new BigDecimal("70.00"));
        claimRepository.save(claim);

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "outcome", "FAILURE",
                        "failureReason", "Simulated bank decline"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));

        assertEquals(1L, countByTypeAndRecipient(NotificationType.PAYMENT_FAILED, patientUser));
        assertEquals(0L, countByTypeAndRecipient(NotificationType.CLAIM_PAID, patientUser));
    }

    @Test
    void rolledBackAppointmentCompletionCreatesNoNotification() throws Exception {
        User patientUser = saveUser("notif-rollback-complete-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Rollback Complete", "5558000011");
        User doctorUser = saveUser("notif-rollback-complete-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Rollback", new BigDecimal("120.00"));
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(9, 30),
                "No policy so rollback",
                AppointmentStatus.CONFIRMED);

        mockMvc.perform(patch("/api/doctor/appointments/{id}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isConflict());

        assertEquals(0L, countByTypeAndRecipient(NotificationType.APPOINTMENT_COMPLETED, patientUser));
        assertEquals(0L, countByTypeAndRecipient(NotificationType.CLAIM_SUBMITTED, patientUser));
    }

    @Test
    void failedPaymentTransactionLeavesNoPartialNotification() throws Exception {
        User patientUser = saveUser("notif-failed-payment-tx-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Failed Tx", "5558000012");
        Doctor doctor = saveDoctor(saveUser("notif-failed-payment-tx-doctor@example.com", UserRole.DOCTOR), "Dr. Failed Tx", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-NOTIF-0007",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Claim claim = saveClaim(
                saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(15, 0), "Failed tx", AppointmentStatus.COMPLETED),
                policy,
                new BigDecimal("150.00"),
                ClaimStatus.APPROVED);
        claim.setApprovedAmount(new BigDecimal("80.00"));
        claim.setPatientResponsibility(new BigDecimal("70.00"));
        claimRepository.save(claim);

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "FAILURE"))))
                .andExpect(status().isBadRequest());

        assertEquals(0L, countByTypeAndRecipient(NotificationType.PAYMENT_FAILED, patientUser));
        assertEquals(0L, countByTypeAndRecipient(NotificationType.CLAIM_PAID, patientUser));
    }

    @Test
    void patientSeesOnlyOwnNotifications() throws Exception {
        User ownerUser = saveUser("notif-list-owner@example.com", UserRole.PATIENT);
        Patient owner = savePatient(ownerUser, "Owner", "5558000013");
        User otherUser = saveUser("notif-list-other@example.com", UserRole.PATIENT);
        savePatient(otherUser, "Other", "5558000014");

        notificationRepository.save(new Notification(ownerUser, NotificationType.SYSTEM, "Owner N1", "owner", null, null));
        notificationRepository.save(new Notification(otherUser, NotificationType.SYSTEM, "Other N1", "other", null, null));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].title").value("Owner N1"));

        assertNotNull(owner.getId());
    }

    @Test
    void anotherPatientCannotMarkNotificationRead() throws Exception {
        User ownerUser = saveUser("notif-own-read-owner@example.com", UserRole.PATIENT);
        savePatient(ownerUser, "Owner", "5558000015");
        User otherUser = saveUser("notif-own-read-other@example.com", UserRole.PATIENT);
        savePatient(otherUser, "Other", "5558000016");

        Notification notification = notificationRepository.save(
                new Notification(ownerUser, NotificationType.SYSTEM, "Owned", "Owned msg", null, null));

        mockMvc.perform(patch("/api/notifications/{id}/read", notification.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(otherUser)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void missingNotificationReturnsNotFound() throws Exception {
        User patientUser = saveUser("notif-missing-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Missing", "5558000017");

        mockMvc.perform(patch("/api/notifications/999999/read")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void doctorAndAdminCannotAccessPatientNotificationEndpoints() throws Exception {
        User doctorUser = saveUser("notif-role-doctor@example.com", UserRole.DOCTOR);
        User adminUser = saveUser("notif-role-admin@example.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/notifications/me/unread-count")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/notifications/me/read-all")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedNotificationEndpointsReturnUnauthorized() throws Exception {
        mockMvc.perform(get("/api/notifications/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/notifications/me/unread-count"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/notifications/1/read"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(patch("/api/notifications/me/read-all"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void newNotificationStartsUnreadAndMarkReadIsIdempotent() throws Exception {
        User patientUser = saveUser("notif-read-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Read Patient", "5558000018");
        Notification notification = notificationRepository.save(
                new Notification(patientUser, NotificationType.SYSTEM, "Unread", "Unread msg", null, null));

        assertEquals(false, notification.isReadStatus());
        assertNull(notification.getReadAt());

        mockMvc.perform(patch("/api/notifications/{id}/read", notification.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true))
                .andExpect(jsonPath("$.readAt").isNotEmpty());

        mockMvc.perform(patch("/api/notifications/{id}/read", notification.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        Notification persisted = notificationRepository.findById(notification.getId()).orElseThrow();
        assertTrue(persisted.isReadStatus());
        assertNotNull(persisted.getReadAt());
    }

    @Test
    void readAllUpdatesOnlyAuthenticatedPatientAndUnreadCountChanges() throws Exception {
        User patientUser = saveUser("notif-readall-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "ReadAll Patient", "5558000019");
        User otherUser = saveUser("notif-readall-other@example.com", UserRole.PATIENT);
        savePatient(otherUser, "ReadAll Other", "5558000020");

        notificationRepository.save(new Notification(patientUser, NotificationType.SYSTEM, "P1", "P1", null, null));
        notificationRepository.save(new Notification(patientUser, NotificationType.SYSTEM, "P2", "P2", null, null));
        notificationRepository.save(new Notification(otherUser, NotificationType.SYSTEM, "O1", "O1", null, null));

        mockMvc.perform(get("/api/notifications/me/unread-count")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2));

        mockMvc.perform(patch("/api/notifications/me/read-all")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedCount").value(2));

        mockMvc.perform(get("/api/notifications/me/unread-count")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(0));

        mockMvc.perform(get("/api/notifications/me/unread-count")
                .header(HttpHeaders.AUTHORIZATION, bearer(otherUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void typeReadFilterPaginationAndSortingWork() throws Exception {
        User patientUser = saveUser("notif-filter-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Filter Patient", "5558000021");

        Notification n1 = notificationRepository.save(new Notification(
                patientUser,
                NotificationType.APPOINTMENT_REQUESTED,
                "A",
                "A",
                "APPOINTMENT",
                1L));
        Notification n2 = notificationRepository.save(new Notification(
                patientUser,
                NotificationType.PAYMENT_SUCCESS,
                "B",
                "B",
                "PAYMENT",
                2L));
        Notification n3 = notificationRepository.save(new Notification(
                patientUser,
                NotificationType.PAYMENT_FAILED,
                "C",
                "C",
                "PAYMENT",
                3L));

        n2.setReadStatus(true);
        n2.setReadAt(n2.getCreatedAt());
        notificationRepository.save(n2);

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("type", "PAYMENT_SUCCESS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].type").value("PAYMENT_SUCCESS"));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("read", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].read").value(true));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("size", "2")
                .queryParam("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "type,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].type").value("APPOINTMENT_REQUESTED"));

        assertNotNull(n1.getId());
        assertNotNull(n3.getId());
    }

    @Test
    void invalidSortFieldDirectionAndFormatReturnBadRequest() throws Exception {
        User patientUser = saveUser("notif-sort-invalid-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Sort Invalid", "5558000022");
        notificationRepository.save(new Notification(patientUser, NotificationType.SYSTEM, "X", "X", null, null));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "patientId,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Unsupported sort field")));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "createdAt,up"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort direction")));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "createdAt"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort format")));
    }

    @Test
    void notificationResponseDoesNotExposeSensitiveFields() throws Exception {
        User patientUser = saveUser("notif-safe-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Safe Patient", "5558000023");
        notificationRepository.save(new Notification(
                patientUser,
                NotificationType.SYSTEM,
                "Safe",
                "Safe msg",
                null,
                null));

        mockMvc.perform(get("/api/notifications/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.content[0].user").doesNotExist())
                .andExpect(jsonPath("$.content[0].patient").doesNotExist())
                .andExpect(jsonPath("$.content[0].appointment").doesNotExist())
                .andExpect(jsonPath("$.content[0].claim").doesNotExist())
                .andExpect(jsonPath("$.content[0].payment").doesNotExist())
                .andExpect(jsonPath("$.content[0].insurancePolicy").doesNotExist());
    }

    @Test
    void notificationPersistenceAndEmailStateRemainSeparateFromReadState() throws Exception {
        User patientUser = saveUser("notif-persist-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Persist Patient", "5558000024");

        Notification notification = new Notification(
                patientUser,
                NotificationType.PAYMENT_FAILED,
                "Payment Failed",
                "Your payment failed.",
                "PAYMENT",
                99L);
        notification.setEmailDeliveryStatus(EmailDeliveryStatus.PENDING);

        Notification saved = notificationRepository.save(notification);
        Notification reloaded = notificationRepository.findById(saved.getId()).orElseThrow();

        assertEquals("Payment Failed", reloaded.getTitle());
        assertEquals("Your payment failed.", reloaded.getMessage());
        assertEquals(NotificationType.PAYMENT_FAILED, reloaded.getType());
        assertEquals(false, reloaded.isReadStatus());
        assertEquals(EmailDeliveryStatus.PENDING, reloaded.getEmailDeliveryStatus());

        reloaded.setReadStatus(true);
        reloaded.setReadAt(reloaded.getCreatedAt());
        notificationRepository.saveAndFlush(reloaded);

        Notification afterRead = notificationRepository.findById(saved.getId()).orElseThrow();
        assertTrue(afterRead.isReadStatus());
        assertNotNull(afterRead.getReadAt());
        assertEquals(EmailDeliveryStatus.PENDING, afterRead.getEmailDeliveryStatus());
    }

    private long countByTypeAndRecipient(NotificationType type, User user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(notification -> notification.getType() == type)
                .count();
    }

    private Notification latestNotification(User user) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseThrow();
    }

    private Notification findLatestByType(User user, NotificationType type) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .filter(notification -> notification.getType() == type)
                .findFirst()
                .orElse(null);
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
    }

    private User saveUser(String email, UserRole role) {
        return userRepository.save(new User(
                email,
                "$2a$10$abcdefghijklmnopqrstuv",
                role,
                AccountStatus.ACTIVE));
    }

    private Patient savePatient(User user, String fullName, String phone) {
        return patientRepository.save(new Patient(user, fullName, phone));
    }

    private Doctor saveDoctor(User user, String fullName, BigDecimal fee) {
        Doctor doctor = new Doctor(
                user,
                fullName,
                "General Medicine",
                "LIC-" + user.getId(),
                "555900" + user.getId(),
                fee);
        doctor.setClinicAddress("Clinic");
        doctor.setAvailableForAppointments(true);
        return doctorRepository.save(doctor);
    }

    private InsurancePolicy savePolicy(
            Patient patient,
            String policyNumber,
            BigDecimal coverage,
            BigDecimal deductible,
            LocalDate startDate,
            LocalDate endDate,
            PolicyStatus status) {

        InsurancePolicy policy = new InsurancePolicy(
                patient,
                "Care Insurance",
                policyNumber,
                coverage,
                deductible,
                startDate,
                endDate);
        policy.setStatus(status);
        return insurancePolicyRepository.save(policy);
    }

    private Appointment saveAppointment(
            Patient patient,
            Doctor doctor,
            LocalDate date,
            LocalTime time,
            String reason,
            AppointmentStatus status) {

        Appointment appointment = new Appointment(patient, doctor, date, time, reason);
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

    private Claim saveClaim(
            Appointment appointment,
            InsurancePolicy policy,
            BigDecimal requestedAmount,
            ClaimStatus status) {

        Claim claim = new Claim(appointment, policy, requestedAmount);
        claim.setStatus(status);

        if (status == ClaimStatus.APPROVED || status == ClaimStatus.PAID) {
            claim.setApprovedAmount(new BigDecimal("80.00"));
            claim.setPatientResponsibility(new BigDecimal("70.00"));
        }

        if (status == ClaimStatus.REJECTED) {
            claim.setRejectionReason("Rejected");
        }

        return claimRepository.save(claim);
    }

    @SuppressWarnings("unused")
    private Payment savePayment(Claim claim, PaymentStatus status) {
        Payment payment = new Payment(
                claim,
                claim.getPatientResponsibility() == null
                        ? new BigDecimal("70.00")
                        : claim.getPatientResponsibility(),
                "CC360-PAY-TEST-" + claim.getId());
        payment.setStatus(status);
        return paymentRepository.save(payment);
    }
}
