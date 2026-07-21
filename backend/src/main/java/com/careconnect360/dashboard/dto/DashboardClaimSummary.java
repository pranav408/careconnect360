package com.careconnect360.dashboard.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.careconnect360.claim.enums.ClaimStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DashboardClaimSummary", description = "Safe claim summary for dashboard use")
public class DashboardClaimSummary {

    @Schema(example = "42")
    private final Long claimId;

    @Schema(example = "101")
    private final Long appointmentId;

    @Schema(example = "11")
    private final Long policyId;

    @Schema(example = "POL-1001")
    private final String policyNumber;

    @Schema(example = "150.00")
    private final BigDecimal requestedAmount;

    @Schema(example = "80.00")
    private final BigDecimal approvedAmount;

    @Schema(example = "70.00")
    private final BigDecimal patientResponsibility;

    @Schema(example = "APPROVED")
    private final ClaimStatus status;

    @Schema(example = "Dr. Sarah Johnson")
    private final String doctorName;

    @Schema(example = "Example Patient")
    private final String patientName;

    @Schema(example = "2026-07-12T11:22:33")
    private final LocalDateTime createdAt;

    public DashboardClaimSummary(
            Long claimId,
            Long appointmentId,
            Long policyId,
            String policyNumber,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            BigDecimal patientResponsibility,
            ClaimStatus status,
            String doctorName,
            String patientName,
            LocalDateTime createdAt) {

        this.claimId = claimId;
        this.appointmentId = appointmentId;
        this.policyId = policyId;
        this.policyNumber = policyNumber;
        this.requestedAmount = requestedAmount;
        this.approvedAmount = approvedAmount;
        this.patientResponsibility = patientResponsibility;
        this.status = status;
        this.doctorName = doctorName;
        this.patientName = patientName;
        this.createdAt = createdAt;
    }

    public Long getClaimId() {
        return claimId;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public Long getPolicyId() {
        return policyId;
    }

    public String getPolicyNumber() {
        return policyNumber;
    }

    public BigDecimal getRequestedAmount() {
        return requestedAmount;
    }

    public BigDecimal getApprovedAmount() {
        return approvedAmount;
    }

    public BigDecimal getPatientResponsibility() {
        return patientResponsibility;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public String getPatientName() {
        return patientName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}