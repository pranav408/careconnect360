package com.careconnect360.claim.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.claim.dto.ClaimResponse;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.claim.service.ClaimService;
import com.careconnect360.patient.entity.Patient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/claims")
@SecurityRequirement(name = "bearerAuth")
public class PatientClaimController {

    private final AuthenticatedUserService authenticatedUserService;
    private final ClaimService claimService;

    public PatientClaimController(
            AuthenticatedUserService authenticatedUserService,
            ClaimService claimService) {

        this.authenticatedUserService = authenticatedUserService;
        this.claimService = claimService;
    }

    @Operation(
        summary = "List my claims",
        description = "Returns only claims that belong to the authenticated patient with optional status, pagination, and sorting.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Claims returned", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid filter or sort", content = @Content(examples = @ExampleObject(value = "{\"status\":400,\"error\":\"Bad Request\",\"message\":\"Unsupported sort field: amount\"}"))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required"),
            @ApiResponse(responseCode = "409", description = "Claim workflow conflict")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Page<ClaimResponse>> listMyClaims(
            Authentication authentication,
            @RequestParam(required = false) ClaimStatus status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        Page<ClaimResponse> response = claimService.listClaimsForPatient(
                patient,
                status,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Get my claim by id",
        description = "Returns claim details only when the claim belongs to the authenticated patient.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Claim returned", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required or ownership mismatch"),
            @ApiResponse(responseCode = "404", description = "Claim not found"),
            @ApiResponse(responseCode = "409", description = "Claim workflow conflict")
        }
    )
    @GetMapping("/{claimId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<ClaimResponse> getMyClaim(
            Authentication authentication,
            @PathVariable Long claimId) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(claimService.getClaimForPatient(patient, claimId));
    }
}
