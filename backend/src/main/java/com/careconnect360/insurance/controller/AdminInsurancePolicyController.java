package com.careconnect360.insurance.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.insurance.dto.InsurancePolicyResponse;
import com.careconnect360.insurance.dto.RejectInsurancePolicyRequest;
import com.careconnect360.insurance.service.InsurancePolicyService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/insurance/policies")
@SecurityRequirement(name = "bearerAuth")
public class AdminInsurancePolicyController {

    private final InsurancePolicyService insurancePolicyService;

    public AdminInsurancePolicyController(InsurancePolicyService insurancePolicyService) {
        this.insurancePolicyService = insurancePolicyService;
    }

    @Operation(
        summary = "List insurance policies",
        description = "Returns admin-viewable insurance policies with optional filters and pagination.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Policies returned", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
        }
    )
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<InsurancePolicyResponse>> listPolicies(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String patientEmail,
            @RequestParam(required = false) String policyNumber,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String sort) {

        Page<InsurancePolicyResponse> response = insurancePolicyService.listPoliciesForAdmin(
                status,
                patientEmail,
                policyNumber,
                page,
                size,
                sort);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Activate policy",
        description = "Activates a pending insurance policy if the patient does not already have an active policy.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Policy activated", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Policy not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition or second active policy conflict")
        }
    )
    @PatchMapping("/{policyId}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InsurancePolicyResponse> activatePolicy(@PathVariable Long policyId) {
        InsurancePolicyResponse response = insurancePolicyService.activatePolicy(policyId);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Reject policy",
        description = "Rejects a pending insurance policy with a required reason.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Policy rejected", content = @Content(schema = @Schema(implementation = InsurancePolicyResponse.class))),
            @ApiResponse(responseCode = "400", description = "Missing rejection reason"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Policy not found"),
            @ApiResponse(responseCode = "409", description = "Invalid transition")
        }
    )
    @PatchMapping("/{policyId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<InsurancePolicyResponse> rejectPolicy(
            @PathVariable Long policyId,
            @Valid @RequestBody RejectInsurancePolicyRequest request) {

        InsurancePolicyResponse response = insurancePolicyService.rejectPolicy(policyId, request);
        return ResponseEntity.ok(response);
    }
}
