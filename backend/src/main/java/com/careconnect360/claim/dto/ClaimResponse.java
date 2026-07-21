package com.careconnect360.claim.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.careconnect360.claim.enums.ClaimStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "ClaimResponse", description = "Safe claim details")
public class ClaimResponse {

    @Schema(example = "42")
    private final Long claimId;

    @Schema(example = "101")
    private final Long appointmentId;

    @Schema(example = "11")
    private final Long policyId;

    @Schema(example = "POL-1001")
    private final String policyNumber;

    @Schema(example = "7")
    private final Long patientId;

    @Schema(example = "Anita Rao")
    private final String patientName;

    @Schema(example = "3")
    private final Long doctorId;

    @Schema(example = "Dr. Sarah Johnson")
    private final String doctorName;

    @Schema(example = "150.00")
    private final BigDecimal requestedAmount;

    @Schema(example = "80.00")
    private final BigDecimal approvedAmount;

    @Schema(example = "70.00")
    private final BigDecimal patientResponsibility;

    @Schema(example = "Insufficient supporting documentation")
    private final String rejectionReason;

    @Schema(example = "SUBMITTED")
    private final ClaimStatus status;

    @Schema(example = "2026-07-12T11:22:33")
    private final LocalDateTime createdAt;

    @Schema(example = "2026-07-12T12:05:00")
    private final LocalDateTime updatedAt;

    public ClaimResponse(
            Long claimId,
            Long appointmentId,
            Long policyId,
            String policyNumber,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            BigDecimal requestedAmount,
            BigDecimal approvedAmount,
            BigDecimal patientResponsibility,
            String rejectionReason,
            ClaimStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.claimId = claimId;
        this.appointmentId = appointmentId;
        this.policyId = policyId;
        this.policyNumber = policyNumber;
        this.patientId = patientId;
        this.patientName = patientName;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.requestedAmount = requestedAmount;
        this.approvedAmount = approvedAmount;
        this.patientResponsibility = patientResponsibility;
        this.rejectionReason = rejectionReason;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public Long getPatientId() {
        return patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public String getDoctorName() {
        return doctorName;
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

    public String getRejectionReason() {
        return rejectionReason;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
