package com.careconnect360.insurance.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.insurance.dto.CreateInsurancePolicyRequest;
import com.careconnect360.insurance.dto.InsurancePolicyResponse;
import com.careconnect360.insurance.service.InsurancePolicyService;
import com.careconnect360.patient.entity.Patient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/insurance/policies")
@SecurityRequirement(name = "bearerAuth")
public class PatientInsurancePolicyController {

    private final AuthenticatedUserService authenticatedUserService;
    private final InsurancePolicyService insurancePolicyService;

    public PatientInsurancePolicyController(
            AuthenticatedUserService authenticatedUserService,
            InsurancePolicyService insurancePolicyService) {

        this.authenticatedUserService = authenticatedUserService;
        this.insurancePolicyService = insurancePolicyService;
    }

    @Operation(
        summary = "Submit insurance policy",
        description = "Submits a new insurance policy for the authenticated patient. Status is always forced to PENDING.",
        responses = {
            @ApiResponse(responseCode = "201", description = "Policy submitted", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required"),
            @ApiResponse(responseCode = "409", description = "Duplicate policy number")
        }
    )
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<InsurancePolicyResponse> submitPolicy(
            Authentication authentication,
            @Valid @RequestBody CreateInsurancePolicyRequest request) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        InsurancePolicyResponse response = insurancePolicyService.submitPolicy(patient, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
        summary = "List my policies",
        description = "Returns all insurance policies belonging to the authenticated patient.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Policies returned", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<List<InsurancePolicyResponse>> listMyPolicies(Authentication authentication) {
        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(insurancePolicyService.listPoliciesForPatient(patient));
    }

    @Operation(
        summary = "Get active policy",
        description = "Returns the active insurance policy for the authenticated patient.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Active policy returned", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "404", description = "No active policy found")
        }
    )
    @GetMapping("/me/active")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<InsurancePolicyResponse> getActivePolicy(Authentication authentication) {
        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(insurancePolicyService.getActivePolicyForPatient(patient));
    }
}
