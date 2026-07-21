package com.careconnect360.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.dashboard.dto.PatientDashboardResponse;
import com.careconnect360.dashboard.service.DashboardService;
import com.careconnect360.patient.entity.Patient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/dashboard/patient")
@SecurityRequirement(name = "bearerAuth")
public class PatientDashboardController {

    private final AuthenticatedUserService authenticatedUserService;
    private final DashboardService dashboardService;

    public PatientDashboardController(
            AuthenticatedUserService authenticatedUserService,
            DashboardService dashboardService) {

        this.authenticatedUserService = authenticatedUserService;
        this.dashboardService = dashboardService;
    }

    @Operation(
        summary = "Get patient dashboard",
        description = "Returns aggregated dashboard data for the authenticated PATIENT only. Identity is resolved from the bearer JWT and no patient id is accepted from the client.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Patient dashboard returned",
                content = @Content(
                    schema = @Schema(implementation = PatientDashboardResponse.class),
                    examples = @ExampleObject(
                        value = "{\"profile\":{\"patientId\":1,\"email\":\"patient@example.com\",\"fullName\":\"Example Patient\",\"phone\":\"5551234567\",\"address\":\"100 Main Street\",\"dateOfBirth\":\"1990-01-15\",\"gender\":\"FEMALE\",\"accountStatus\":\"ACTIVE\"},\"activePolicy\":{\"policyId\":11,\"policyNumber\":\"POL-1001\",\"providerName\":\"Blue Cross\",\"coveragePercentage\":85.00,\"deductibleAmount\":250.00,\"startDate\":\"2026-01-01\",\"endDate\":\"2026-12-31\",\"status\":\"ACTIVE\"},\"upcomingAppointments\":[{\"appointmentId\":101,\"appointmentDate\":\"2026-08-20\",\"appointmentTime\":\"10:30:00\",\"reason\":\"Routine check-up\",\"status\":\"CONFIRMED\",\"doctorId\":7,\"doctorName\":\"Dr. Sarah Johnson\",\"doctorSpecialization\":\"Cardiology\",\"patientId\":1,\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T09:15:30\"}],\"appointmentCounts\":[{\"status\":\"REQUESTED\",\"count\":1},{\"status\":\"CONFIRMED\",\"count\":2},{\"status\":\"REJECTED\",\"count\":0},{\"status\":\"CANCELLED\",\"count\":1},{\"status\":\"COMPLETED\",\"count\":3}],\"claimCounts\":[{\"status\":\"SUBMITTED\",\"count\":0},{\"status\":\"VERIFIED\",\"count\":1},{\"status\":\"APPROVED\",\"count\":2},{\"status\":\"REJECTED\",\"count\":0},{\"status\":\"PAID\",\"count\":1}],\"outstandingPatientResponsibility\":70.00,\"recentClaims\":[{\"claimId\":42,\"appointmentId\":101,\"policyId\":11,\"policyNumber\":\"POL-1001\",\"requestedAmount\":150.00,\"approvedAmount\":80.00,\"patientResponsibility\":70.00,\"status\":\"APPROVED\",\"doctorName\":\"Dr. Sarah Johnson\",\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T11:22:33\"}],\"recentPayments\":[{\"paymentId\":25,\"claimId\":42,\"appointmentId\":101,\"transactionReference\":\"CC360-PAY-3fa85f64-5717-4562-b3fc-2c963f66afa6\",\"amount\":70.00,\"status\":\"SUCCESS\",\"failureReason\":null,\"paidAt\":\"2026-07-12T14:20:00\",\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T14:19:30\"}],\"unreadNotificationCount\":3}"
                    )
                )
            ),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required"),
            @ApiResponse(responseCode = "404", description = "Authenticated patient profile not found")
        }
    )
    @GetMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientDashboardResponse> getDashboard(Authentication authentication) {
        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(dashboardService.getPatientDashboard(patient));
    }
}