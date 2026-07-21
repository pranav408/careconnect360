package com.careconnect360.payment.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.payment.dto.MockPaymentRequest;
import com.careconnect360.payment.dto.PaymentResponse;
import com.careconnect360.payment.service.PaymentService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
@SecurityRequirement(name = "bearerAuth")
public class PatientPaymentController {

    private final AuthenticatedUserService authenticatedUserService;
    private final PaymentService paymentService;

    public PatientPaymentController(
            AuthenticatedUserService authenticatedUserService,
            PaymentService paymentService) {

        this.authenticatedUserService = authenticatedUserService;
        this.paymentService = paymentService;
    }

    @Operation(
        summary = "Pay approved claim (mock)",
        description = "Processes a deterministic mock payment for an APPROVED claim that belongs to the authenticated PATIENT.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            required = true,
            content = @Content(
                schema = @Schema(implementation = MockPaymentRequest.class),
                examples = {
                    @ExampleObject(
                        name = "Success request",
                        value = "{\"outcome\":\"SUCCESS\"}"),
                    @ExampleObject(
                        name = "Failure request",
                        value = "{\"outcome\":\"FAILURE\",\"failureReason\":\"Simulated bank decline\"}")
                }
            )
        ),
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Payment processed",
                content = @Content(
                    schema = @Schema(implementation = PaymentResponse.class),
                    examples = {
                        @ExampleObject(
                            name = "Successful payment response",
                            value = "{\"paymentId\":25,\"claimId\":42,\"appointmentId\":101,\"transactionReference\":\"CC360-PAY-3fa85f64-5717-4562-b3fc-2c963f66afa6\",\"amount\":70.00,\"status\":\"SUCCESS\",\"paidAt\":\"2026-07-12T14:20:00\",\"createdAt\":\"2026-07-12T14:19:30\",\"updatedAt\":\"2026-07-12T14:20:00\"}"
                        ),
                        @ExampleObject(
                            name = "Failed payment response",
                            value = "{\"paymentId\":26,\"claimId\":43,\"appointmentId\":102,\"transactionReference\":\"CC360-PAY-2a4f3590-68e3-4e4d-9c11-7cd014ad8f6d\",\"amount\":25.00,\"status\":\"FAILED\",\"failureReason\":\"Simulated bank decline\",\"createdAt\":\"2026-07-12T15:05:00\",\"updatedAt\":\"2026-07-12T15:05:00\"}"
                        )
                    }
                )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required or ownership mismatch"),
            @ApiResponse(responseCode = "404", description = "Claim not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition or duplicate payment")
        }
    )
    @PostMapping("/claims/{claimId}")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PaymentResponse> payApprovedClaim(
            Authentication authentication,
            @PathVariable Long claimId,
            @Valid @RequestBody MockPaymentRequest request) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        PaymentResponse response = paymentService.processMockPayment(patient, claimId, request);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "List my payment history",
        description = "Returns only payments belonging to the authenticated PATIENT, with optional status filtering, pagination, and sorting.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Payments returned", content = @Content(schema = @Schema(implementation = PaymentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid filter or sort", content = @Content(examples = @ExampleObject(value = "{\"status\":400,\"error\":\"Bad Request\",\"message\":\"Unsupported sort field: patientId\"}"))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Page<PaymentResponse>> listMyPayments(
            Authentication authentication,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        Page<PaymentResponse> response = paymentService.listPaymentsForPatient(
                patient,
                status,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }
}
