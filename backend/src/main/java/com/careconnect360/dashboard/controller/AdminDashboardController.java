package com.careconnect360.dashboard.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.dashboard.dto.AdminDashboardResponse;
import com.careconnect360.dashboard.service.DashboardService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/dashboard/admin")
@SecurityRequirement(name = "bearerAuth")
public class AdminDashboardController {

    private final DashboardService dashboardService;

    public AdminDashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @Operation(
        summary = "Get admin dashboard",
        description = "Returns aggregated system dashboard data for ADMIN users only.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Admin dashboard returned",
                content = @Content(
                    schema = @Schema(implementation = AdminDashboardResponse.class),
                    examples = @ExampleObject(
                        value = "{\"totalPatientCount\":12,\"totalDoctorCount\":5,\"availableDoctorCount\":4,\"totalAppointmentCount\":18,\"appointmentCounts\":[{\"status\":\"REQUESTED\",\"count\":2},{\"status\":\"CONFIRMED\",\"count\":3},{\"status\":\"REJECTED\",\"count\":1},{\"status\":\"CANCELLED\",\"count\":2},{\"status\":\"COMPLETED\",\"count\":10}],\"policyCounts\":[{\"status\":\"PENDING\",\"count\":1},{\"status\":\"ACTIVE\",\"count\":8},{\"status\":\"REJECTED\",\"count\":1},{\"status\":\"EXPIRED\",\"count\":2}],\"claimCounts\":[{\"status\":\"SUBMITTED\",\"count\":1},{\"status\":\"VERIFIED\",\"count\":2},{\"status\":\"APPROVED\",\"count\":3},{\"status\":\"REJECTED\",\"count\":1},{\"status\":\"PAID\",\"count\":4}],\"successfulPaymentCount\":6,\"failedPaymentCount\":2,\"totalSuccessfulPaymentAmount\":420.00,\"unreadNotificationCount\":7,\"recentAppointments\":[{\"appointmentId\":101,\"appointmentDate\":\"2026-08-20\",\"appointmentTime\":\"10:30:00\",\"reason\":\"Routine check-up\",\"status\":\"CONFIRMED\",\"doctorId\":7,\"doctorName\":\"Dr. Sarah Johnson\",\"doctorSpecialization\":\"Cardiology\",\"patientId\":1,\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T09:15:30\"}],\"recentClaims\":[{\"claimId\":42,\"appointmentId\":101,\"policyId\":11,\"policyNumber\":\"POL-1001\",\"requestedAmount\":150.00,\"approvedAmount\":80.00,\"patientResponsibility\":70.00,\"status\":\"APPROVED\",\"doctorName\":\"Dr. Sarah Johnson\",\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T11:22:33\"}],\"recentSuccessfulPayments\":[{\"paymentId\":25,\"claimId\":42,\"appointmentId\":101,\"transactionReference\":\"CC360-PAY-3fa85f64-5717-4562-b3fc-2c963f66afa6\",\"amount\":70.00,\"status\":\"SUCCESS\",\"failureReason\":null,\"paidAt\":\"2026-07-12T14:20:00\",\"patientName\":\"Example Patient\",\"createdAt\":\"2026-07-12T14:19:30\"}],\"averageSettlementTime\":\"UNSUPPORTED\"}"
                    )
                )
            ),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Admin role required")
        }
    )
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDashboardResponse> getDashboard() {
        return ResponseEntity.ok(dashboardService.getAdminDashboard());
    }
}