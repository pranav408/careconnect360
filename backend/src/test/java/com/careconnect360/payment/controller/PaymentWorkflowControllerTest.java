package com.careconnect360.payment.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentWorkflowControllerTest {

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
    void paymentEntityConstructorDefaultsToInitiatedStatus() {
        Patient patient = savePatient(saveUser("entity-init-patient@example.com", UserRole.PATIENT), "Entity Init", "5557000001");
        Doctor doctor = saveDoctor(saveUser("entity-init-doctor@example.com", UserRole.DOCTOR), "Dr. Init", new BigDecimal("100.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0001");
        Appointment appointment = saveAppointment(patient, doctor, "Constructor");
        Claim claim = saveApprovedClaim(appointment, policy, new BigDecimal("100.00"), new BigDecimal("30.00"));

        Payment payment = new Payment(claim, new BigDecimal("30.00"), "CC360-PAY-ENTITY-INIT-1");
        assertEquals(PaymentStatus.INITIATED, payment.getStatus());
    }

    @Test
    void patientCanPayOwnApprovedClaim() throws Exception {
        User patientUser = saveUser("pay-own-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Own Patient", "5557000002");
        Doctor doctor = saveDoctor(saveUser("pay-own-doctor@example.com", UserRole.DOCTOR), "Dr. Own", new BigDecimal("150.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0002");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Own approved"), policy, new BigDecimal("150.00"), new BigDecimal("70.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.claimId").value(claim.getId()));
    }

    @Test
    void anotherPatientCannotPayTheClaim() throws Exception {
        User ownerUser = saveUser("pay-owner@example.com", UserRole.PATIENT);
        Patient owner = savePatient(ownerUser, "Owner", "5557000003");
        User otherUser = saveUser("pay-other@example.com", UserRole.PATIENT);
        savePatient(otherUser, "Other", "5557000004");

        Doctor doctor = saveDoctor(saveUser("pay-guard-doctor@example.com", UserRole.DOCTOR), "Dr. Guard", new BigDecimal("120.00"));
        InsurancePolicy policy = savePolicy(owner, "POL-PAY-0003");
        Claim claim = saveApprovedClaim(saveAppointment(owner, doctor, "Guarded"), policy, new BigDecimal("120.00"), new BigDecimal("40.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(otherUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void doctorCannotAccessPaymentEndpoints() throws Exception {
        User doctorUser = saveUser("payment-doctor-role@example.com", UserRole.DOCTOR);

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/payments/claims/1")
                .header(HttpHeaders.AUTHORIZATION, bearer(doctorUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCannotAccessPatientPaymentEndpoints() throws Exception {
        User adminUser = saveUser("payment-admin-role@example.com", UserRole.ADMIN);

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/payments/claims/1")
                .header(HttpHeaders.AUTHORIZATION, bearer(adminUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void unauthenticatedRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/payments/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/payments/claims/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void missingClaimReturnsNotFound() throws Exception {
        User patientUser = saveUser("missing-payment-claim@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Missing", "5557000005");

        mockMvc.perform(post("/api/payments/claims/999999")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void submittedClaimCannotBePaid() throws Exception {
        assertClaimStatusCannotBePaid(ClaimStatus.SUBMITTED, "pay-submitted-patient@example.com", "POL-PAY-0004");
    }

    @Test
    void verifiedClaimCannotBePaid() throws Exception {
        assertClaimStatusCannotBePaid(ClaimStatus.VERIFIED, "pay-verified-patient@example.com", "POL-PAY-0005");
    }

    @Test
    void rejectedClaimCannotBePaid() throws Exception {
        assertClaimStatusCannotBePaid(ClaimStatus.REJECTED, "pay-rejected-patient@example.com", "POL-PAY-0006");
    }

    @Test
    void paidClaimCannotBePaid() throws Exception {
        assertClaimStatusCannotBePaid(ClaimStatus.PAID, "pay-paid-patient@example.com", "POL-PAY-0007");
    }

    @Test
    void amountEqualsPatientResponsibilityClientCannotOverrideAndStoredWithScaleTwo() throws Exception {
        User patientUser = saveUser("pay-amount-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Amount Patient", "5557000006");
        Doctor doctor = saveDoctor(saveUser("pay-amount-doctor@example.com", UserRole.DOCTOR), "Dr. Amount", new BigDecimal("155.55"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0008");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Scale and override"), policy, new BigDecimal("155.55"), new BigDecimal("70.005"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"outcome\":\"SUCCESS\",\"amount\":999.99}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(70.01));

        Payment persisted = paymentRepository.findByClaimId(claim.getId()).orElseThrow();
        assertEquals(new BigDecimal("70.01"), persisted.getAmount());
    }

    @Test
    void negativePatientResponsibilityIsRejected() throws Exception {
        User patientUser = saveUser("pay-negative-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Negative Patient", "5557000007");
        Doctor doctor = saveDoctor(saveUser("pay-negative-doctor@example.com", UserRole.DOCTOR), "Dr. Negative", new BigDecimal("130.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0009");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Negative amount"), policy, new BigDecimal("130.00"), new BigDecimal("-1.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("cannot be negative")));

        assertEquals(0L, paymentRepository.count());
    }

    @Test
    void successPaymentPersistsAndMarksClaimPaid() throws Exception {
        User patientUser = saveUser("pay-success-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Success Patient", "5557000008");
        Doctor doctor = saveDoctor(saveUser("pay-success-doctor@example.com", UserRole.DOCTOR), "Dr. Success", new BigDecimal("140.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0010");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Success processing"), policy, new BigDecimal("140.00"), new BigDecimal("50.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.transactionReference").value(containsString("CC360-PAY-")))
                .andExpect(jsonPath("$.paidAt").isNotEmpty());

        Payment payment = paymentRepository.findByClaimId(claim.getId()).orElseThrow();
        Claim persistedClaim = claimRepository.findById(claim.getId()).orElseThrow();

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertNotNull(payment.getPaidAt());
        assertNull(payment.getFailureReason());
        assertEquals(ClaimStatus.PAID, persistedClaim.getStatus());
    }

    @Test
    void successPaymentGeneratesUniqueTransactionReferences() throws Exception {
        User patientUser = saveUser("pay-tx-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Tx Patient", "5557000009");
        Doctor doctor = saveDoctor(saveUser("pay-tx-doctor@example.com", UserRole.DOCTOR), "Dr. Tx", new BigDecimal("160.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0011");

        Claim first = saveApprovedClaim(saveAppointment(patient, doctor, "Tx first"), policy, new BigDecimal("160.00"), new BigDecimal("60.00"));
        Claim second = saveApprovedClaim(saveAppointment(patient, doctor, "Tx second"), policy, new BigDecimal("160.00"), new BigDecimal("65.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", first.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/payments/claims/{claimId}", second.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk());

        String firstRef = paymentRepository.findByClaimId(first.getId()).orElseThrow().getTransactionReference();
        String secondRef = paymentRepository.findByClaimId(second.getId()).orElseThrow().getTransactionReference();

        assertNotEquals(firstRef, secondRef);
    }

    @Test
    void failurePaymentPersistsAndClaimRemainsApproved() throws Exception {
        User patientUser = saveUser("pay-failure-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Failure Patient", "5557000010");
        Doctor doctor = saveDoctor(saveUser("pay-failure-doctor@example.com", UserRole.DOCTOR), "Dr. Failure", new BigDecimal("145.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0012");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Failure processing"), policy, new BigDecimal("145.00"), new BigDecimal("45.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "outcome", "FAILURE",
                        "failureReason", "Simulated bank decline"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.failureReason").value("Simulated bank decline"));

        Payment payment = paymentRepository.findByClaimId(claim.getId()).orElseThrow();
        Claim persistedClaim = claimRepository.findById(claim.getId()).orElseThrow();

        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        assertNull(payment.getPaidAt());
        assertEquals("Simulated bank decline", payment.getFailureReason());
        assertEquals(ClaimStatus.APPROVED, persistedClaim.getStatus());
    }

    @Test
    void failureOutcomeWithoutReasonReturnsBadRequestAndLeavesNoPartialState() throws Exception {
        User patientUser = saveUser("pay-failure-no-reason@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "No Reason Patient", "5557000011");
        Doctor doctor = saveDoctor(saveUser("pay-failure-no-reason-doctor@example.com", UserRole.DOCTOR), "Dr. No Reason", new BigDecimal("110.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0013");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "No reason"), policy, new BigDecimal("110.00"), new BigDecimal("30.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "FAILURE"))))
                .andExpect(status().isBadRequest());

        assertEquals(0L, paymentRepository.count());
        Claim reloaded = claimRepository.findById(claim.getId()).orElseThrow();
        assertEquals(ClaimStatus.APPROVED, reloaded.getStatus());
    }

    @Test
    void duplicatePaymentRequestReturnsConflict() throws Exception {
        User patientUser = saveUser("pay-duplicate-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Duplicate Patient", "5557000012");
        Doctor doctor = saveDoctor(saveUser("pay-duplicate-doctor@example.com", UserRole.DOCTOR), "Dr. Duplicate", new BigDecimal("170.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0014");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Duplicate"), policy, new BigDecimal("170.00"), new BigDecimal("55.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertEquals(1L, paymentRepository.count());
    }

    @Test
    void failedPaymentAlsoBlocksSecondRow() throws Exception {
        User patientUser = saveUser("pay-failed-duplicate-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Failed Duplicate", "5557000013");
        Doctor doctor = saveDoctor(saveUser("pay-failed-duplicate-doctor@example.com", UserRole.DOCTOR), "Dr. Failed Duplicate", new BigDecimal("135.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0015");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Failed duplicate"), policy, new BigDecimal("135.00"), new BigDecimal("35.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "outcome", "FAILURE",
                        "failureReason", "Simulated gateway timeout"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isConflict());

        assertEquals(1L, paymentRepository.count());
    }

    @Test
    void paymentUniqueClaimConstraintIsPreserved() {
        User patientUser = saveUser("pay-unique-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Unique Patient", "5557000014");
        Doctor doctor = saveDoctor(saveUser("pay-unique-doctor@example.com", UserRole.DOCTOR), "Dr. Unique", new BigDecimal("180.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0016");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Unique constraint"), policy, new BigDecimal("180.00"), new BigDecimal("80.00"));

        Payment first = new Payment(claim, new BigDecimal("80.00"), "CC360-PAY-UNIQUE-0001");
        paymentRepository.saveAndFlush(first);

        Payment second = new Payment(claim, new BigDecimal("80.00"), "CC360-PAY-UNIQUE-0002");
        assertThrows(DataIntegrityViolationException.class, () -> paymentRepository.saveAndFlush(second));
    }

    @Test
    void patientRetrievesOnlyOwnPayments() throws Exception {
        User ownerUser = saveUser("history-owner@example.com", UserRole.PATIENT);
        Patient owner = savePatient(ownerUser, "History Owner", "5557000015");
        User otherUser = saveUser("history-other@example.com", UserRole.PATIENT);
        Patient other = savePatient(otherUser, "History Other", "5557000016");
        Doctor doctor = saveDoctor(saveUser("history-doctor@example.com", UserRole.DOCTOR), "Dr. History", new BigDecimal("150.00"));

        InsurancePolicy ownerPolicy = savePolicy(owner, "POL-PAY-0017");
        InsurancePolicy otherPolicy = savePolicy(other, "POL-PAY-0018");

        Claim ownerClaim = saveApprovedClaim(saveAppointment(owner, doctor, "Owner history"), ownerPolicy, new BigDecimal("150.00"), new BigDecimal("70.00"));
        Claim otherClaim = saveApprovedClaim(saveAppointment(other, doctor, "Other history"), otherPolicy, new BigDecimal("150.00"), new BigDecimal("65.00"));

        performSuccessPayment(ownerUser, ownerClaim.getId());
        performSuccessPayment(otherUser, otherClaim.getId());

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(ownerUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].claimId").value(ownerClaim.getId()));
    }

    @Test
    void historyStatusFilterWorks() throws Exception {
        User patientUser = saveUser("history-filter-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "History Filter", "5557000017");
        Doctor doctor = saveDoctor(saveUser("history-filter-doctor@example.com", UserRole.DOCTOR), "Dr. Filter", new BigDecimal("120.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0019");

        Claim successClaim = saveApprovedClaim(saveAppointment(patient, doctor, "Filter success"), policy, new BigDecimal("120.00"), new BigDecimal("40.00"));
        Claim failedClaim = saveApprovedClaim(saveAppointment(patient, doctor, "Filter failed"), policy, new BigDecimal("120.00"), new BigDecimal("35.00"));

        performSuccessPayment(patientUser, successClaim.getId());
        performFailurePayment(patientUser, failedClaim.getId(), "Simulated card decline");

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("status", "FAILED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].status").value("FAILED"));
    }

    @Test
    void historyPaginationWorks() throws Exception {
        User patientUser = saveUser("history-page-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "History Page", "5557000018");
        Doctor doctor = saveDoctor(saveUser("history-page-doctor@example.com", UserRole.DOCTOR), "Dr. Page", new BigDecimal("140.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0020");

        Claim first = saveApprovedClaim(saveAppointment(patient, doctor, "Page first"), policy, new BigDecimal("140.00"), new BigDecimal("10.00"));
        Claim second = saveApprovedClaim(saveAppointment(patient, doctor, "Page second"), policy, new BigDecimal("140.00"), new BigDecimal("20.00"));
        Claim third = saveApprovedClaim(saveAppointment(patient, doctor, "Page third"), policy, new BigDecimal("140.00"), new BigDecimal("30.00"));

        performSuccessPayment(patientUser, first.getId());
        performSuccessPayment(patientUser, second.getId());
        performSuccessPayment(patientUser, third.getId());

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("page", "0")
                .queryParam("size", "2")
                .queryParam("sort", "amount,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void historySortingWorks() throws Exception {
        User patientUser = saveUser("history-sort-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "History Sort", "5557000019");
        Doctor doctor = saveDoctor(saveUser("history-sort-doctor@example.com", UserRole.DOCTOR), "Dr. Sort", new BigDecimal("130.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0021");

        Claim low = saveApprovedClaim(saveAppointment(patient, doctor, "Sort low"), policy, new BigDecimal("130.00"), new BigDecimal("11.00"));
        Claim high = saveApprovedClaim(saveAppointment(patient, doctor, "Sort high"), policy, new BigDecimal("130.00"), new BigDecimal("95.00"));

        performSuccessPayment(patientUser, low.getId());
        performSuccessPayment(patientUser, high.getId());

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "amount,asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].amount").value(11.00))
                .andExpect(jsonPath("$.content[1].amount").value(95.00));
    }

    @Test
    void historyInvalidSortFieldReturnsBadRequest() throws Exception {
        User patientUser = saveUser("history-sort-field-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Sort Field", "5557000020");

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "patientId,asc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Unsupported sort field")));
    }

    @Test
    void historyInvalidSortDirectionReturnsBadRequest() throws Exception {
        User patientUser = saveUser("history-sort-dir-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Sort Direction", "5557000021");

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "amount,up"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort direction")));
    }

    @Test
    void historyMalformedSortReturnsBadRequest() throws Exception {
        User patientUser = saveUser("history-sort-malformed-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Sort Malformed", "5557000022");

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .queryParam("sort", "amount"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("Invalid sort format")));
    }

    @Test
    void responseSafetyOmitsSensitiveAndRelationshipInternals() throws Exception {
        User patientUser = saveUser("response-safe-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Response Safe", "5557000023");
        Doctor doctor = saveDoctor(saveUser("response-safe-doctor@example.com", UserRole.DOCTOR), "Dr. Safe", new BigDecimal("100.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0022");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Safe fields"), policy, new BigDecimal("100.00"), new BigDecimal("20.00"));

        performSuccessPayment(patientUser, claim.getId());

        mockMvc.perform(get("/api/payments/me")
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].password").doesNotExist())
                .andExpect(jsonPath("$.content[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.content[0].user").doesNotExist())
                .andExpect(jsonPath("$.content[0].patient").doesNotExist())
                .andExpect(jsonPath("$.content[0].doctor").doesNotExist())
                .andExpect(jsonPath("$.content[0].claim").doesNotExist())
                .andExpect(jsonPath("$.content[0].appointment").doesNotExist())
                .andExpect(jsonPath("$.content[0].insurancePolicy").doesNotExist());
    }

    @Test
    void successValuesPersistAfterRepositoryReloadAndClaimStatusPersists() throws Exception {
        User patientUser = saveUser("reload-success-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Reload Success", "5557000024");
        Doctor doctor = saveDoctor(saveUser("reload-success-doctor@example.com", UserRole.DOCTOR), "Dr. Reload Success", new BigDecimal("125.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0023");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Reload success"), policy, new BigDecimal("125.00"), new BigDecimal("25.00"));

        performSuccessPayment(patientUser, claim.getId());

        Payment payment = paymentRepository.findByClaimId(claim.getId()).orElseThrow();
        Claim reloadedClaim = claimRepository.findById(claim.getId()).orElseThrow();

        assertEquals(PaymentStatus.SUCCESS, payment.getStatus());
        assertNotNull(payment.getPaidAt());
        assertNull(payment.getFailureReason());
        assertEquals(ClaimStatus.PAID, reloadedClaim.getStatus());
    }

    @Test
    void failureValuesPersistAfterRepositoryReloadAndClaimStatusRemainsApproved() throws Exception {
        User patientUser = saveUser("reload-failure-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Reload Failure", "5557000025");
        Doctor doctor = saveDoctor(saveUser("reload-failure-doctor@example.com", UserRole.DOCTOR), "Dr. Reload Failure", new BigDecimal("115.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0024");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Reload failure"), policy, new BigDecimal("115.00"), new BigDecimal("15.00"));

        performFailurePayment(patientUser, claim.getId(), "Simulated issuer rejection");

        Payment payment = paymentRepository.findByClaimId(claim.getId()).orElseThrow();
        Claim reloadedClaim = claimRepository.findById(claim.getId()).orElseThrow();

        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        assertNull(payment.getPaidAt());
        assertEquals("Simulated issuer rejection", payment.getFailureReason());
        assertEquals(ClaimStatus.APPROVED, reloadedClaim.getStatus());
    }

    @Test
    void zeroDollarPatientResponsibilityIsRejectedWithBadRequest() throws Exception {
        User patientUser = saveUser("zero-payment-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Zero Payment", "5557000026");
        Doctor doctor = saveDoctor(saveUser("zero-payment-doctor@example.com", UserRole.DOCTOR), "Dr. Zero", new BigDecimal("90.00"));
        InsurancePolicy policy = savePolicy(patient, "POL-PAY-0025");
        Claim claim = saveApprovedClaim(saveAppointment(patient, doctor, "Zero responsibility"), policy, new BigDecimal("90.00"), new BigDecimal("0.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("No payment is required")));

        assertEquals(0L, paymentRepository.count());
    }

    private void assertClaimStatusCannotBePaid(
            ClaimStatus status,
            String patientEmail,
            String policyNumber) throws Exception {

        User patientUser = saveUser(patientEmail, UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Blocked Status", "5557000100");
        Doctor doctor = saveDoctor(saveUser(policyNumber.toLowerCase() + "-doctor@example.com", UserRole.DOCTOR), "Dr. Block", new BigDecimal("110.00"));
        InsurancePolicy policy = savePolicy(patient, policyNumber);
        Claim claim = saveClaimWithStatus(saveAppointment(patient, doctor, "Blocked status"), policy, new BigDecimal("110.00"), status, new BigDecimal("20.00"));

        mockMvc.perform(post("/api/payments/claims/{claimId}", claim.getId())
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertEquals(0L, paymentRepository.count());
    }

    private void performSuccessPayment(User patientUser, Long claimId) throws Exception {
        mockMvc.perform(post("/api/payments/claims/{claimId}", claimId)
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("outcome", "SUCCESS"))))
                .andExpect(status().isOk());
    }

    private void performFailurePayment(User patientUser, Long claimId, String reason) throws Exception {
        mockMvc.perform(post("/api/payments/claims/{claimId}", claimId)
                .header(HttpHeaders.AUTHORIZATION, bearer(patientUser))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "outcome", "FAILURE",
                        "failureReason", reason))))
                .andExpect(status().isOk());
    }

    private String bearer(User user) {
        return "Bearer " + jwtService.generateToken(user);
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
                "5559992211",
                consultationFee);
        doctor.setClinicAddress("20 Health Avenue");
        doctor.setAvailableForAppointments(true);
        return doctorRepository.save(doctor);
    }

    private InsurancePolicy savePolicy(Patient patient, String policyNumber) {
        InsurancePolicy policy = new InsurancePolicy(
                patient,
                "CareShield",
                policyNumber,
                new BigDecimal("80.00"),
                new BigDecimal("25.00"),
                LocalDate.now().minusDays(5),
                LocalDate.now().plusDays(30));
        policy.setStatus(PolicyStatus.ACTIVE);
        return insurancePolicyRepository.save(policy);
    }

    private Appointment saveAppointment(Patient patient, Doctor doctor, String reason) {
        Appointment appointment = new Appointment(
                patient,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(10, 30),
                reason);
        appointment.setStatus(AppointmentStatus.COMPLETED);
        return appointmentRepository.save(appointment);
    }

    private Claim saveApprovedClaim(
            Appointment appointment,
            InsurancePolicy policy,
            BigDecimal requestedAmount,
            BigDecimal patientResponsibility) {

        Claim claim = new Claim(appointment, policy, requestedAmount);
        claim.setApprovedAmount(requestedAmount.subtract(patientResponsibility));
        claim.setPatientResponsibility(patientResponsibility);
        claim.setStatus(ClaimStatus.APPROVED);
        return claimRepository.save(claim);
    }

    private Claim saveClaimWithStatus(
            Appointment appointment,
            InsurancePolicy policy,
            BigDecimal requestedAmount,
            ClaimStatus status,
            BigDecimal patientResponsibility) {

        Claim claim = new Claim(appointment, policy, requestedAmount);
        claim.setStatus(status);

        if (status == ClaimStatus.APPROVED || status == ClaimStatus.PAID) {
            claim.setApprovedAmount(requestedAmount.subtract(patientResponsibility));
            claim.setPatientResponsibility(patientResponsibility);
        }

        if (status == ClaimStatus.REJECTED) {
            claim.setRejectionReason("Rejected for test setup");
        }

        return claimRepository.save(claim);
    }
}
