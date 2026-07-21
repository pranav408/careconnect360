package com.careconnect360.claim.controller;

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

import com.careconnect360.claim.dto.ClaimResponse;
import com.careconnect360.claim.dto.RejectClaimRequest;
import com.careconnect360.claim.service.ClaimService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/admin/claims")
@SecurityRequirement(name = "bearerAuth")
public class AdminClaimController {

    private final ClaimService claimService;

    public AdminClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @Operation(
        summary = "List claims for admin review",
        description = "Returns claims with optional filters by status, patient email, policy number, and appointment id.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Claims returned", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid filter or sort", content = @Content(examples = @ExampleObject(value = "{\"status\":400,\"error\":\"Bad Request\",\"message\":\"Invalid sort format. Expected field,direction\"}"))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
        }
    )
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<ClaimResponse>> listClaims(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String patientEmail,
            @RequestParam(required = false) String policyNumber,
            @RequestParam(required = false) Long appointmentId,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Page<ClaimResponse> response = claimService.listClaimsForAdmin(
                status,
                patientEmail,
                policyNumber,
                appointmentId,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Verify submitted claim",
        description = "Transitions claim status from SUBMITTED to VERIFIED.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Claim verified", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Claim not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{claimId}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimResponse> verifyClaim(
            @PathVariable Long claimId) {

        return ResponseEntity.ok(claimService.verifyClaim(claimId));
    }

    @Operation(
        summary = "Approve verified claim",
        description = "Transitions claim status from VERIFIED to APPROVED and calculates approved amount and patient responsibility using the linked policy.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Claim approved", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Claim not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{claimId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimResponse> approveClaim(
            @PathVariable Long claimId) {

        return ResponseEntity.ok(claimService.approveClaim(claimId));
    }

    @Operation(
        summary = "Reject verified claim",
        description = "Transitions claim status from VERIFIED to REJECTED with a required rejection reason.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            required = true,
            content = @Content(
                schema = @Schema(implementation = RejectClaimRequest.class),
                examples = @ExampleObject(value = "{\"reason\":\"Coverage prerequisites were not met\"}"))),
        responses = {
            @ApiResponse(responseCode = "200", description = "Claim rejected", content = @Content(schema = @Schema(implementation = ClaimResponse.class))),
            @ApiResponse(responseCode = "400", description = "Missing or invalid rejection reason"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required"),
            @ApiResponse(responseCode = "404", description = "Claim not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{claimId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ClaimResponse> rejectClaim(
            @PathVariable Long claimId,
            @Valid @RequestBody RejectClaimRequest request) {

        return ResponseEntity.ok(claimService.rejectClaim(claimId, request));
    }
}
