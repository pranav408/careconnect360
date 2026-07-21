package com.careconnect360.insurance.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
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
import com.careconnect360.claim.repository.ClaimRepository;
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
class InsurancePolicyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private InsurancePolicyRepository insurancePolicyRepository;

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
        insurancePolicyRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void patientCanSubmitPolicyAndStatusIsForcedToPending() throws Exception {
        User patientUser = saveUser("patient-submit@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Submitter", "5551111111");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerName", "Blue Cross");
        payload.put("policyNumber", "POL-1001");
        payload.put("coveragePercentage", new BigDecimal("85.00"));
        payload.put("deductibleAmount", new BigDecimal("250.00"));
        payload.put("startDate", "2026-01-01");
        payload.put("endDate", "2026-12-31");
        payload.put("status", "ACTIVE");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.policyNumber").value("POL-1001"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.providerName").value("Blue Cross"));

        InsurancePolicy persisted = insurancePolicyRepository.findByPolicyNumberIgnoreCase("POL-1001").orElseThrow();
        assertEquals(patient.getId(), persisted.getPatient().getId());
        assertEquals(PolicyStatus.PENDING, persisted.getStatus());
    }

    @Test
    void patientCannotAssignAnotherPatientThroughRequestPayload() throws Exception {
        User firstPatientUser = saveUser("patient-a@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "Patient A", "5552222222");
        User secondPatientUser = saveUser("patient-b@example.com", UserRole.PATIENT);
        savePatient(secondPatientUser, "Patient B", "5553333333");
        String token = jwtService.generateToken(firstPatientUser);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerName", "Aetna");
        payload.put("policyNumber", "POL-2002");
        payload.put("coveragePercentage", new BigDecimal("90.00"));
        payload.put("deductibleAmount", new BigDecimal("100.00"));
        payload.put("startDate", "2026-02-01");
        payload.put("endDate", "2027-01-31");
        payload.put("patientId", 9999L);

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());

        InsurancePolicy persisted = insurancePolicyRepository.findByPolicyNumberIgnoreCase("POL-2002").orElseThrow();
        assertEquals(firstPatient.getId(), persisted.getPatient().getId());
    }

    @Test
    void duplicatePolicyNumberReturnsConflict() throws Exception {
        User patientUser = saveUser("patient-dup@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Dup Patient", "5554444444");
        String token = jwtService.generateToken(patientUser);

        postPolicy(token, "Policy One", "POL-DUP", new BigDecimal("80.00"), new BigDecimal("500.00"));

        Map<String, Object> duplicatePayload = new LinkedHashMap<>();
        duplicatePayload.put("providerName", "Policy Two");
        duplicatePayload.put("policyNumber", "POL-DUP");
        duplicatePayload.put("coveragePercentage", new BigDecimal("75.00"));
        duplicatePayload.put("deductibleAmount", new BigDecimal("300.00"));
        duplicatePayload.put("startDate", "2026-01-01");
        duplicatePayload.put("endDate", "2026-12-31");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicatePayload)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(containsString("policy number")));
    }

    @Test
    void invalidCoverageAndDeductibleAndDateRangeReturnBadRequest() throws Exception {
        User patientUser = saveUser("patient-invalid@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Invalid Patient", "5555555555");
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> badCoveragePayload = new LinkedHashMap<>();
        badCoveragePayload.put("providerName", "Bad Coverage");
        badCoveragePayload.put("policyNumber", "POL-3001");
        badCoveragePayload.put("coveragePercentage", new BigDecimal("101.00"));
        badCoveragePayload.put("deductibleAmount", new BigDecimal("0.00"));
        badCoveragePayload.put("startDate", "2026-01-01");
        badCoveragePayload.put("endDate", "2026-12-31");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badCoveragePayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        Map<String, Object> badDeductiblePayload = new LinkedHashMap<>();
        badDeductiblePayload.put("providerName", "Bad Deductible");
        badDeductiblePayload.put("policyNumber", "POL-3002");
        badDeductiblePayload.put("coveragePercentage", new BigDecimal("80.00"));
        badDeductiblePayload.put("deductibleAmount", new BigDecimal("-1.00"));
        badDeductiblePayload.put("startDate", "2026-01-01");
        badDeductiblePayload.put("endDate", "2026-12-31");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badDeductiblePayload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        Map<String, Object> payload = buildPayload("Bad Dates", "POL-3003", new BigDecimal("60.00"), new BigDecimal("0.00"));
        payload.put("startDate", "2026-10-01");
        payload.put("endDate", "2026-09-01");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void patientRetrievesOnlyOwnPolicies() throws Exception {
        User firstPatientUser = saveUser("patient-own-1@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "Own 1", "5556666666");
        User secondPatientUser = saveUser("patient-own-2@example.com", UserRole.PATIENT);
        Patient secondPatient = savePatient(secondPatientUser, "Own 2", "5557777777");
        String token = jwtService.generateToken(firstPatientUser);

        savePolicy(firstPatient, "Policy A", "POL-4001", new BigDecimal("70.00"), new BigDecimal("100.00"));
        savePolicy(secondPatient, "Policy B", "POL-4002", new BigDecimal("75.00"), new BigDecimal("200.00"));

        mockMvc.perform(get("/api/insurance/policies/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].policyNumber").value("POL-4001"));
    }

    @Test
    void patientRetrievesActivePolicy() throws Exception {
        User patientUser = saveUser("patient-active@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Active Patient", "5558888888");
        String token = jwtService.generateToken(patientUser);

        InsurancePolicy pending = savePolicy(patient, "Pending Provider", "POL-5001", new BigDecimal("60.00"), new BigDecimal("50.00"));
        pending.setStatus(PolicyStatus.PENDING);
        insurancePolicyRepository.save(pending);

        InsurancePolicy active = savePolicy(patient, "Active Provider", "POL-5002", new BigDecimal("80.00"), new BigDecimal("60.00"));
        active.setStatus(PolicyStatus.ACTIVE);
        insurancePolicyRepository.save(active);

        mockMvc.perform(get("/api/insurance/policies/me/active")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyNumber").value("POL-5002"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void patientCannotAccessAdminEndpoints() throws Exception {
        User patientUser = saveUser("patient-admin@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Patient Admin", "5559999999");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/admin/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void doctorCannotAccessPatientOrAdminPolicyActions() throws Exception {
        User doctorUser = saveUser("doctor-policy@example.com", UserRole.DOCTOR);
        String token = jwtService.generateToken(doctorUser);

        Map<String, Object> doctorPayload = new LinkedHashMap<>();
        doctorPayload.put("providerName", "Doctor Provider");
        doctorPayload.put("policyNumber", "POL-6001");
        doctorPayload.put("coveragePercentage", new BigDecimal("70.00"));
        doctorPayload.put("deductibleAmount", new BigDecimal("50.00"));
        doctorPayload.put("startDate", "2026-01-01");
        doctorPayload.put("endDate", "2026-12-31");

        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(doctorPayload)))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanListPoliciesAndActivateOrReject() throws Exception {
        User patientUser = saveUser("patient-admin-list@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "List Patient", "5550000000");
        InsurancePolicy pending = savePolicy(patient, "Kind Provider", "POL-7001", new BigDecimal("85.00"), new BigDecimal("75.00"));
        User adminUser = saveUser("admin-insurance@example.com", UserRole.ADMIN);
        String adminToken = jwtService.generateToken(adminUser);

        mockMvc.perform(get("/api/admin/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].policyNumber").value("POL-7001"));

        mockMvc.perform(patch("/api/admin/insurance/policies/{policyId}/activate", pending.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        pending.setStatus(PolicyStatus.PENDING);
        insurancePolicyRepository.save(pending);

        mockMvc.perform(patch("/api/admin/insurance/policies/{policyId}/reject", pending.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("reason", "Insufficient documentation"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

        @Test
        void adminListDefaultsToCreatedAtDescendingSort() throws Exception {
                User patientUser = saveUser("patient-sort-default@example.com", UserRole.PATIENT);
                Patient patient = savePatient(patientUser, "Sort Default", "5551414141");
                savePolicy(patient, "Old Provider", "POL-9101", new BigDecimal("70.00"), new BigDecimal("80.00"));
                Thread.sleep(5);
                savePolicy(patient, "New Provider", "POL-9102", new BigDecimal("75.00"), new BigDecimal("90.00"));

                User adminUser = saveUser("admin-sort-default@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content.length()").value(2))
                                .andExpect(jsonPath("$.content[0].policyNumber").value("POL-9102"))
                                .andExpect(jsonPath("$.content[1].policyNumber").value("POL-9101"));
        }

        @Test
        void adminListSupportsPolicyNumberAscendingSort() throws Exception {
                User patientUser = saveUser("patient-sort-number@example.com", UserRole.PATIENT);
                Patient patient = savePatient(patientUser, "Sort Number", "5551515151");
                savePolicy(patient, "Provider One", "POL-Z100", new BigDecimal("70.00"), new BigDecimal("80.00"));
                savePolicy(patient, "Provider Two", "POL-A100", new BigDecimal("75.00"), new BigDecimal("90.00"));

                User adminUser = saveUser("admin-sort-number@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .queryParam("sort", "policyNumber,asc")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].policyNumber").value("POL-A100"))
                                .andExpect(jsonPath("$.content[1].policyNumber").value("POL-Z100"));
        }

        @Test
        void adminListSupportsProviderNameDescendingSort() throws Exception {
                User patientUser = saveUser("patient-sort-provider@example.com", UserRole.PATIENT);
                Patient patient = savePatient(patientUser, "Sort Provider", "5551616161");
                savePolicy(patient, "Alpha Provider", "POL-9201", new BigDecimal("70.00"), new BigDecimal("80.00"));
                savePolicy(patient, "Zulu Provider", "POL-9202", new BigDecimal("75.00"), new BigDecimal("90.00"));

                User adminUser = saveUser("admin-sort-provider@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .queryParam("sort", "providerName,desc")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.content[0].providerName").value("Zulu Provider"))
                                .andExpect(jsonPath("$.content[1].providerName").value("Alpha Provider"));
        }

        @Test
        void adminListRejectsInvalidSortField() throws Exception {
                User adminUser = saveUser("admin-sort-invalid-field@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .queryParam("sort", "patient,asc")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.status").value(400))
                                .andExpect(jsonPath("$.message").value(containsString("Unsupported sort field")));
        }

        @Test
        void adminListRejectsInvalidSortDirection() throws Exception {
                User adminUser = saveUser("admin-sort-invalid-direction@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .queryParam("sort", "policyNumber,up")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.status").value(400))
                                .andExpect(jsonPath("$.message").value(containsString("Invalid sort direction")));
        }

        @Test
        void adminListRejectsMalformedSortValue() throws Exception {
                User adminUser = saveUser("admin-sort-malformed@example.com", UserRole.ADMIN);
                String adminToken = jwtService.generateToken(adminUser);

                mockMvc.perform(get("/api/admin/insurance/policies")
                                .queryParam("sort", "policyNumber")
                                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.status").value(400))
                                .andExpect(jsonPath("$.message").value(containsString("Invalid sort format")));
        }

    @Test
    void nonPendingTransitionsReturnConflictAndSecondActivePolicyIsBlocked() throws Exception {
        User patientUser = saveUser("patient-conflict@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Conflict Patient", "5551212121");
        User adminUser = saveUser("admin-conflict@example.com", UserRole.ADMIN);
        String adminToken = jwtService.generateToken(adminUser);

        InsurancePolicy active = savePolicy(patient, "Active Provider", "POL-8001", new BigDecimal("90.00"), new BigDecimal("80.00"));
        active.setStatus(PolicyStatus.ACTIVE);
        insurancePolicyRepository.save(active);

        mockMvc.perform(patch("/api/admin/insurance/policies/{policyId}/activate", active.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        InsurancePolicy pending = savePolicy(patient, "Pending Provider", "POL-8002", new BigDecimal("70.00"), new BigDecimal("60.00"));
        mockMvc.perform(patch("/api/admin/insurance/policies/{policyId}/activate", pending.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void adminActivateMissingPolicyReturnsNotFoundWithStandardErrorResponse() throws Exception {
        User adminUser = saveUser("admin-missing-policy@example.com", UserRole.ADMIN);
        String adminToken = jwtService.generateToken(adminUser);

        mockMvc.perform(patch("/api/admin/insurance/policies/999999/activate")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message", containsString("Insurance policy was not found")))
                .andExpect(jsonPath("$.path").value("/api/admin/insurance/policies/999999/activate"));
    }

    @Test
    void patientWithoutActivePolicyReturnsNotFoundWithStandardErrorResponse() throws Exception {
        User patientUser = saveUser("patient-no-active@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "No Active", "5551717171");
        savePolicy(patient, "Pending Provider", "POL-9301", new BigDecimal("70.00"), new BigDecimal("80.00"));
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/insurance/policies/me/active")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message", containsString("No active insurance policy")))
                .andExpect(jsonPath("$.path").value("/api/insurance/policies/me/active"));
    }

    @Test
    void policyResponsesExcludeSensitiveAndRelationshipInternalFields() throws Exception {
        User patientUser = saveUser("patient-safe@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Safe Patient", "5551313131");
        savePolicy(patient, "Safe Provider", "POL-9401", new BigDecimal("85.00"), new BigDecimal("45.00"));
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/insurance/policies/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].policyNumber").value("POL-9401"))
                .andExpect(jsonPath("$[0].password").doesNotExist())
                .andExpect(jsonPath("$[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$[0].user").doesNotExist())
                .andExpect(jsonPath("$[0].patient").doesNotExist())
                .andExpect(jsonPath("$[0].patient.user").doesNotExist());
    }

    private void postPolicy(String token, String providerName, String policyNumber, BigDecimal coverage, BigDecimal deductible) throws Exception {
        mockMvc.perform(post("/api/insurance/policies")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildPayload(providerName, policyNumber, coverage, deductible))))
                .andExpect(status().isCreated());
    }

    private Map<String, Object> buildPayload(String providerName, String policyNumber, BigDecimal coveragePercentage, BigDecimal deductibleAmount) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerName", providerName);
        payload.put("policyNumber", policyNumber);
        payload.put("coveragePercentage", coveragePercentage);
        payload.put("deductibleAmount", deductibleAmount);
        payload.put("startDate", "2026-01-01");
        payload.put("endDate", "2026-12-31");
        return payload;
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(email, "hashed-password", role, AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Patient savePatient(User user, String fullName, String phone) {
        Patient patient = new Patient(user, fullName, phone);
        return patientRepository.save(patient);
    }

    private InsurancePolicy savePolicy(Patient patient, String providerName, String policyNumber, BigDecimal coveragePercentage, BigDecimal deductibleAmount) {
        InsurancePolicy policy = new InsurancePolicy(
                patient,
                providerName,
                policyNumber,
                coveragePercentage,
                deductibleAmount,
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 12, 31));
        return insurancePolicyRepository.save(policy);
    }
}
