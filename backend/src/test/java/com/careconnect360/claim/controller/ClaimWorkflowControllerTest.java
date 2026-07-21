package com.careconnect360.claim.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.dao.DataIntegrityViolationException;
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
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ClaimWorkflowControllerTest {

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
    void completingConfirmedAppointmentCreatesSubmittedClaimWithDoctorFee() throws Exception {
        User patientUser = saveUser("auto-claim-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Auto Claim Patient", "5551111001");
        User doctorUser = saveUser("auto-claim-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Auto Claim", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-CLAIM-1001",
                new BigDecimal("80.00"),
                new BigDecimal("50.00"),
                LocalDate.now().minusDays(10),
                LocalDate.now().plusDays(10),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(10, 30),
                "Auto claim create",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        Claim claim = claimRepository.findByAppointmentId(appointment.getId()).orElseThrow();
        assertEquals(ClaimStatus.SUBMITTED, claim.getStatus());
        assertEquals(new BigDecimal("150.00"), claim.getRequestedAmount());
        assertEquals(appointment.getId(), claim.getAppointment().getId());
        assertEquals(policy.getId(), claim.getInsurancePolicy().getId());
    }

    @Test
    void repeatedCompletionAttemptReturnsConflictAndDoesNotDuplicateClaim() throws Exception {
        User patientUser = saveUser("repeat-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Repeat Patient", "5551111002");
        User doctorUser = saveUser("repeat-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Repeat", new BigDecimal("120.00"));

        savePolicy(
                patient,
                "POL-CLAIM-1002",
                new BigDecimal("70.00"),
                new BigDecimal("25.00"),
                LocalDate.now().minusDays(3),
                LocalDate.now().plusDays(30),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(11, 0),
                "Repeat complete",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertEquals(1L, claimRepository.count());
    }

    @Test
    void uniqueAppointmentClaimConstraintIsPreserved() {
        User patientUser = saveUser("unique-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Unique Patient", "5551111003");
        User doctorUser = saveUser("unique-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Unique", new BigDecimal("90.00"));

        InsurancePolicy policy = savePolicy(
                patient,
                "POL-CLAIM-1003",
                new BigDecimal("80.00"),
                new BigDecimal("10.00"),
                LocalDate.now().minusDays(2),
                LocalDate.now().plusDays(30),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(3),
                LocalTime.of(9, 45),
                "Unique constraint",
                AppointmentStatus.CONFIRMED);

        Claim first = new Claim(appointment, policy, new BigDecimal("90.00"));
        claimRepository.saveAndFlush(first);

        Claim second = new Claim(appointment, policy, new BigDecimal("90.00"));
        assertThrows(DataIntegrityViolationException.class, () -> claimRepository.saveAndFlush(second));
    }

    @Test
    void noValidActivePolicyReturnsConflictAndLeavesAppointmentConfirmed() throws Exception {
        User patientUser = saveUser("no-policy-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "No Policy Patient", "5551111004");
        User doctorUser = saveUser("no-policy-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. No Policy", new BigDecimal("130.00"));

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(4),
                LocalTime.of(14, 15),
                "No policy",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        Appointment persisted = appointmentRepository.findById(appointment.getId()).orElseThrow();
        assertEquals(AppointmentStatus.CONFIRMED, persisted.getStatus());
        assertEquals(0L, claimRepository.count());
    }

    @Test
    void expiredPolicyIsNotUsedForClaimCreation() throws Exception {
        User patientUser = saveUser("expired-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Expired Patient", "5551111005");
        User doctorUser = saveUser("expired-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Expired", new BigDecimal("110.00"));

        savePolicy(
                patient,
                "POL-CLAIM-1005",
                new BigDecimal("80.00"),
                new BigDecimal("20.00"),
                LocalDate.now().minusMonths(2),
                LocalDate.now().minusDays(1),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(5),
                LocalTime.of(15, 0),
                "Expired policy",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isConflict());

        assertTrue(claimRepository.findByAppointmentId(appointment.getId()).isEmpty());
    }

    @Test
    void futurePolicyIsNotUsedForClaimCreation() throws Exception {
        User patientUser = saveUser("future-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Future Patient", "5551111006");
        User doctorUser = saveUser("future-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Future", new BigDecimal("110.00"));

        savePolicy(
                patient,
                "POL-CLAIM-1006",
                new BigDecimal("80.00"),
                new BigDecimal("20.00"),
                LocalDate.now().plusDays(10),
                LocalDate.now().plusMonths(2),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(13, 45),
                "Future policy",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isConflict());

        assertTrue(claimRepository.findByAppointmentId(appointment.getId()).isEmpty());
    }

    @Test
    void policyBelongingToAnotherPatientIsNotUsed() throws Exception {
        User ownerUser = saveUser("owner-patient@example.com", UserRole.PATIENT);
        Patient ownerPatient = savePatient(ownerUser, "Owner Patient", "5551111007");
        User otherUser = saveUser("other-patient@example.com", UserRole.PATIENT);
        Patient otherPatient = savePatient(otherUser, "Other Patient", "5551111008");
        User doctorUser = saveUser("other-policy-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Other Policy", new BigDecimal("115.00"));

        savePolicy(
                otherPatient,
                "POL-CLAIM-1007",
                new BigDecimal("80.00"),
                new BigDecimal("10.00"),
                LocalDate.now().minusDays(3),
                LocalDate.now().plusDays(20),
                PolicyStatus.ACTIVE);

        Appointment appointment = saveAppointment(
                ownerPatient,
                doctor,
                LocalDate.now().plusDays(3),
                LocalTime.of(16, 0),
                "Wrong owner policy",
                AppointmentStatus.CONFIRMED);

        String doctorToken = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isConflict());

        Appointment persisted = appointmentRepository.findById(appointment.getId()).orElseThrow();
        assertEquals(AppointmentStatus.CONFIRMED, persisted.getStatus());
        assertEquals(0L, claimRepository.count());
    }

    @Test
    void patientRetrievesOnlyOwnClaims() throws Exception {
        User ownerUser = saveUser("my-claims-owner@example.com", UserRole.PATIENT);
        Patient ownerPatient = savePatient(ownerUser, "Owner", "5551111009");
        User otherUser = saveUser("my-claims-other@example.com", UserRole.PATIENT);
        Patient otherPatient = savePatient(otherUser, "Other", "5551111010");
        User doctorUser = saveUser("my-claims-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Listing", new BigDecimal("95.00"));

        InsurancePolicy ownerPolicy = savePolicy(ownerPatient, "POL-CLAIM-1008", new BigDecimal("70.00"), new BigDecimal("5.00"), LocalDate.now().minusDays(1), LocalDate.now().plusDays(30), PolicyStatus.ACTIVE);
        InsurancePolicy otherPolicy = savePolicy(otherPatient, "POL-CLAIM-1009", new BigDecimal("70.00"), new BigDecimal("5.00"), LocalDate.now().minusDays(1), LocalDate.now().plusDays(30), PolicyStatus.ACTIVE);

        Appointment ownerAppointment = saveAppointment(ownerPatient, doctor, LocalDate.now().plusDays(1), LocalTime.of(8, 15), "Mine", AppointmentStatus.COMPLETED);
        Appointment otherAppointment = saveAppointment(otherPatient, doctor, LocalDate.now().plusDays(1), LocalTime.of(8, 45), "Theirs", AppointmentStatus.COMPLETED);

        saveClaim(ownerAppointment, ownerPolicy, new BigDecimal("95.00"), ClaimStatus.SUBMITTED);
        saveClaim(otherAppointment, otherPolicy, new BigDecimal("95.00"), ClaimStatus.SUBMITTED);

        String ownerToken = jwtService.generateToken(ownerUser);
        mockMvc.perform(get("/api/claims/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].patientId").value(ownerPatient.getId()));
    }

    @Test
    void patientRetrievesOwnedClaimDetail() throws Exception {
        User patientUser = saveUser("claim-detail-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Claim Detail", "5551111011");
        User doctorUser = saveUser("claim-detail-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Detail", new BigDecimal("105.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1010", new BigDecimal("80.00"), new BigDecimal("10.00"), LocalDate.now().minusDays(1), LocalDate.now().plusDays(30), PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(patient, doctor, LocalDate.now().plusDays(2), LocalTime.of(10, 0), "Detail", AppointmentStatus.COMPLETED);
        Claim claim = saveClaim(appointment, policy, new BigDecimal("105.00"), ClaimStatus.SUBMITTED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(get("/api/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.claimId").value(claim.getId()))
                .andExpect(jsonPath("$.appointmentId").value(appointment.getId()));
    }

    @Test
    void anotherPatientCannotAccessClaim() throws Exception {
        User ownerUser = saveUser("claim-owner@example.com", UserRole.PATIENT);
        Patient ownerPatient = savePatient(ownerUser, "Owner", "5551111012");
        User otherUser = saveUser("claim-other@example.com", UserRole.PATIENT);
        savePatient(otherUser, "Other", "5551111013");
        User doctorUser = saveUser("claim-guard-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Guard", new BigDecimal("100.00"));

        InsurancePolicy policy = savePolicy(ownerPatient, "POL-CLAIM-1011", new BigDecimal("75.00"), new BigDecimal("15.00"), LocalDate.now().minusDays(3), LocalDate.now().plusDays(15), PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(ownerPatient, doctor, LocalDate.now().plusDays(2), LocalTime.of(9, 30), "Protected", AppointmentStatus.COMPLETED);
        Claim claim = saveClaim(appointment, policy, new BigDecimal("100.00"), ClaimStatus.SUBMITTED);

        String otherToken = jwtService.generateToken(otherUser);
        mockMvc.perform(get("/api/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + otherToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void missingClaimReturnsNotFoundForPatientDetail() throws Exception {
        User patientUser = saveUser("missing-claim-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Missing Claim", "5551111014");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/claims/999999")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void noTokenReturnsUnauthorizedForPatientClaims() throws Exception {
        mockMvc.perform(get("/api/claims/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void doctorAndAdminCannotAccessPatientClaimEndpoints() throws Exception {
        User doctorUser = saveUser("patient-claims-doctor@example.com", UserRole.DOCTOR);
        User adminUser = saveUser("patient-claims-admin@example.com", UserRole.ADMIN);

        String doctorToken = jwtService.generateToken(doctorUser);
        String adminToken = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/api/claims/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/claims/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanListClaimsAndFilterByStatusPatientEmailPolicyAndAppointment() throws Exception {
        User adminUser = saveUser("admin-list-claims@example.com", UserRole.ADMIN);
        User patientUser = saveUser("admin-list-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Admin Filter", "5551111015");
        User doctorUser = saveUser("admin-list-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Admin Filter", new BigDecimal("125.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1012", new BigDecimal("82.50"), new BigDecimal("40.00"), LocalDate.now().minusDays(5), LocalDate.now().plusDays(50), PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(patient, doctor, LocalDate.now().plusDays(3), LocalTime.of(11, 30), "Admin filter", AppointmentStatus.COMPLETED);
        saveClaim(appointment, policy, new BigDecimal("125.00"), ClaimStatus.SUBMITTED);

        String token = jwtService.generateToken(adminUser);
        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .queryParam("status", "SUBMITTED")
                .queryParam("patientEmail", patientUser.getEmail())
                .queryParam("policyNumber", "1012")
                .queryParam("appointmentId", String.valueOf(appointment.getId()))
                .queryParam("sort", "createdAt,desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1));
    }

    @Test
    void adminVerifyApproveRejectWorkflowAndInvalidTransitions() throws Exception {
        User adminUser = saveUser("admin-workflow@example.com", UserRole.ADMIN);
        User patientUser = saveUser("admin-workflow-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Workflow Patient", "5551111016");
        User doctorUser = saveUser("admin-workflow-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Workflow", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1013", new BigDecimal("80.00"), new BigDecimal("50.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);

        Appointment apptVerify = saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(12, 0), "Verify", AppointmentStatus.COMPLETED);
        Claim verifyClaim = saveClaim(apptVerify, policy, new BigDecimal("150.00"), ClaimStatus.SUBMITTED);

        Appointment apptReject = saveAppointment(patient, doctor, LocalDate.now().plusDays(2), LocalTime.of(12, 30), "Reject", AppointmentStatus.COMPLETED);
        Claim rejectClaim = saveClaim(apptReject, policy, new BigDecimal("150.00"), ClaimStatus.VERIFIED);

        Appointment apptBad = saveAppointment(patient, doctor, LocalDate.now().plusDays(3), LocalTime.of(13, 0), "Bad transitions", AppointmentStatus.COMPLETED);
        Claim badSubmitted = saveClaim(apptBad, policy, new BigDecimal("150.00"), ClaimStatus.SUBMITTED);

        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/claims/{claimId}/verify", verifyClaim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"));

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", verifyClaim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(patch("/api/admin/claims/{claimId}/reject", rejectClaim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Coverage prerequisites were not met"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Coverage prerequisites were not met"));

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", badSubmitted.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/admin/claims/{claimId}/reject", badSubmitted.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Not allowed yet"))))
                .andExpect(status().isConflict());

        Claim approvedPersisted = claimRepository.findById(verifyClaim.getId()).orElseThrow();
        Claim rejectedPersisted = claimRepository.findById(rejectClaim.getId()).orElseThrow();
        assertEquals(ClaimStatus.APPROVED, approvedPersisted.getStatus());
        assertEquals(ClaimStatus.REJECTED, rejectedPersisted.getStatus());
        assertNotNull(rejectedPersisted.getRejectionReason());
    }

    @Test
    void verifyInvalidStatusesReturnConflict() throws Exception {
        User adminUser = saveUser("admin-verify-invalid@example.com", UserRole.ADMIN);
        User patientUser = saveUser("verify-invalid-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Verify Invalid", "5551111017");
        User doctorUser = saveUser("verify-invalid-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Verify Invalid", new BigDecimal("100.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1014", new BigDecimal("60.00"), new BigDecimal("10.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        Claim verified = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(13, 15), "V", AppointmentStatus.COMPLETED), policy, new BigDecimal("100.00"), ClaimStatus.VERIFIED);
        Claim approved = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(13, 45), "A", AppointmentStatus.COMPLETED), policy, new BigDecimal("100.00"), ClaimStatus.APPROVED);
        Claim rejected = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(14, 15), "R", AppointmentStatus.COMPLETED), policy, new BigDecimal("100.00"), ClaimStatus.REJECTED);

        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/claims/{claimId}/verify", verified.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/admin/claims/{claimId}/verify", approved.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/admin/claims/{claimId}/verify", rejected.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void approvingApprovedOrRejectedClaimReturnsConflict() throws Exception {
        User adminUser = saveUser("admin-approve-invalid@example.com", UserRole.ADMIN);
        User patientUser = saveUser("approve-invalid-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Approve Invalid", "5551111018");
        User doctorUser = saveUser("approve-invalid-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Approve Invalid", new BigDecimal("100.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1015", new BigDecimal("70.00"), new BigDecimal("20.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        Claim approved = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(2), LocalTime.of(9, 0), "Approved", AppointmentStatus.COMPLETED), policy, new BigDecimal("100.00"), ClaimStatus.APPROVED);
        Claim rejected = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(2), LocalTime.of(9, 30), "Rejected", AppointmentStatus.COMPLETED), policy, new BigDecimal("100.00"), ClaimStatus.REJECTED);

        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", approved.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", rejected.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void missingClaimReturnsNotFoundForAdminTransitions() throws Exception {
        User adminUser = saveUser("admin-missing-claim@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/claims/999999/verify")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/admin/claims/999999/approve")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/admin/claims/999999/reject")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Missing"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void patientAndDoctorCannotAccessAdminClaimEndpoints() throws Exception {
        User patientUser = saveUser("admin-endpoint-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Admin Endpoint Patient", "5551111019");
        User doctorUser = saveUser("admin-endpoint-doctor@example.com", UserRole.DOCTOR);

        String patientToken = jwtService.generateToken(patientUser);
        String doctorToken = jwtService.generateToken(doctorUser);

        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + patientToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void financialCalculationUsesDeductibleThenCoverageAndRoundsToTwoDecimals() throws Exception {
        User adminUser = saveUser("admin-finance@example.com", UserRole.ADMIN);
        User patientUser = saveUser("finance-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Finance Patient", "5551111020");
        User doctorUser = saveUser("finance-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Finance", new BigDecimal("150.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1016", new BigDecimal("80.00"), new BigDecimal("50.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(15, 45), "Finance math", AppointmentStatus.COMPLETED);
        Claim claim = saveClaim(appointment, policy, new BigDecimal("150.00"), ClaimStatus.VERIFIED);

        String token = jwtService.generateToken(adminUser);
        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedAmount").value(80.00))
                .andExpect(jsonPath("$.patientResponsibility").value(70.00));

        Claim persisted = claimRepository.findById(claim.getId()).orElseThrow();
        assertEquals(new BigDecimal("80.00"), persisted.getApprovedAmount());
        assertEquals(new BigDecimal("70.00"), persisted.getPatientResponsibility());
        assertEquals(new BigDecimal("150.00"), persisted.getApprovedAmount().add(persisted.getPatientResponsibility()));
    }

    @Test
    void deductibleGreaterThanRequestedResultsInZeroApprovedAmount() throws Exception {
        User adminUser = saveUser("admin-deductible@example.com", UserRole.ADMIN);
        User patientUser = saveUser("deductible-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Deductible Patient", "5551111021");
        User doctorUser = saveUser("deductible-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Deductible", new BigDecimal("75.00"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1017", new BigDecimal("80.00"), new BigDecimal("100.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        Claim claim = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(16, 15), "Deductible", AppointmentStatus.COMPLETED), policy, new BigDecimal("75.00"), ClaimStatus.VERIFIED);

        String token = jwtService.generateToken(adminUser);
        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedAmount").value(0.00))
                .andExpect(jsonPath("$.patientResponsibility").value(75.00));
    }

    @Test
    void hundredAndZeroPercentCoverageBehaveCorrectlyAndNoNegativeValues() throws Exception {
        User adminUser = saveUser("admin-percentages@example.com", UserRole.ADMIN);
        User patientUser = saveUser("percentages-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Percentages", "5551111022");
        User doctorUser = saveUser("percentages-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Percentages", new BigDecimal("100.00"));

        InsurancePolicy fullPolicy = savePolicy(patient, "POL-CLAIM-1018", new BigDecimal("100.00"), new BigDecimal("10.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        InsurancePolicy zeroPolicy = savePolicy(patient, "POL-CLAIM-1019", new BigDecimal("0.00"), new BigDecimal("10.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);

        Claim fullClaim = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(3), LocalTime.of(10, 10), "Full", AppointmentStatus.COMPLETED), fullPolicy, new BigDecimal("100.00"), ClaimStatus.VERIFIED);
        Claim zeroClaim = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(3), LocalTime.of(10, 40), "Zero", AppointmentStatus.COMPLETED), zeroPolicy, new BigDecimal("100.00"), ClaimStatus.VERIFIED);

        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", fullClaim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedAmount").value(90.00))
                .andExpect(jsonPath("$.patientResponsibility").value(10.00));

        mockMvc.perform(patch("/api/admin/claims/{claimId}/approve", zeroClaim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvedAmount").value(0.00))
                .andExpect(jsonPath("$.patientResponsibility").value(100.00));

        Claim fullPersisted = claimRepository.findById(fullClaim.getId()).orElseThrow();
        Claim zeroPersisted = claimRepository.findById(zeroClaim.getId()).orElseThrow();
        assertTrue(fullPersisted.getApprovedAmount().compareTo(BigDecimal.ZERO) >= 0);
        assertTrue(fullPersisted.getPatientResponsibility().compareTo(BigDecimal.ZERO) >= 0);
        assertTrue(zeroPersisted.getApprovedAmount().compareTo(BigDecimal.ZERO) >= 0);
        assertTrue(zeroPersisted.getPatientResponsibility().compareTo(BigDecimal.ZERO) >= 0);
    }

    @Test
    void responseSafetyOmitsSensitiveAndRelationshipInternals() throws Exception {
        User patientUser = saveUser("safe-claim-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Safe Claim", "5551111023");
        User doctorUser = saveUser("safe-claim-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Safe Claim", new BigDecimal("99.99"));

        InsurancePolicy policy = savePolicy(patient, "POL-CLAIM-1020", new BigDecimal("75.00"), new BigDecimal("15.00"), LocalDate.now().minusDays(2), LocalDate.now().plusDays(20), PolicyStatus.ACTIVE);
        Claim claim = saveClaim(saveAppointment(patient, doctor, LocalDate.now().plusDays(1), LocalTime.of(11, 11), "Safe response", AppointmentStatus.COMPLETED), policy, new BigDecimal("99.99"), ClaimStatus.SUBMITTED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(get("/api/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.patient").doesNotExist())
                .andExpect(jsonPath("$.doctor").doesNotExist())
                .andExpect(jsonPath("$.appointment").doesNotExist())
                .andExpect(jsonPath("$.insurancePolicy").doesNotExist());
    }

    @Test
    void adminSortingValidationRejectsMalformedSortFieldOrDirection() throws Exception {
        User adminUser = saveUser("admin-sort-validation@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .queryParam("sort", "requestedAmount"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort format")));

        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .queryParam("sort", "unsupported,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Unsupported sort field")));

        mockMvc.perform(get("/api/admin/claims")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .queryParam("sort", "createdAt,up"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort direction")));
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(email, "hashed-password", role, AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Patient savePatient(User user, String fullName, String phone) {
        return patientRepository.save(new Patient(user, fullName, phone));
    }

    private Doctor saveDoctor(User user, String fullName, BigDecimal consultationFee) {
        Doctor doctor = new Doctor(
                user,
                fullName,
                "General Medicine",
                "LIC-" + Math.abs(user.getEmail().hashCode()),
                "5559991111",
                consultationFee);
        doctor.setClinicAddress("10 Care Avenue");
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
                "TrustCare",
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
        return claimRepository.save(claim);
    }
}
