package com.careconnect360.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "AdminDashboardResponse", description = "Aggregated admin dashboard response")
public class AdminDashboardResponse {

    @Schema(example = "12")
    private final long totalPatientCount;
    @Schema(example = "5")
    private final long totalDoctorCount;
    @Schema(example = "4")
    private final long availableDoctorCount;
    @Schema(example = "18")
    private final long totalAppointmentCount;
    private final List<StatusCountResponse> appointmentCounts;
    private final List<StatusCountResponse> policyCounts;
    private final List<StatusCountResponse> claimCounts;
    @Schema(example = "6")
    private final long successfulPaymentCount;
    @Schema(example = "2")
    private final long failedPaymentCount;
    @Schema(example = "420.00")
    private final BigDecimal totalSuccessfulPaymentAmount;
    @Schema(example = "7")
    private final long unreadNotificationCount;
    private final List<DashboardAppointmentSummary> recentAppointments;
    private final List<DashboardClaimSummary> recentClaims;
    private final List<DashboardPaymentSummary> recentSuccessfulPayments;
    @Schema(example = "UNSUPPORTED")
    private final String averageSettlementTime;

    public AdminDashboardResponse(
            long totalPatientCount,
            long totalDoctorCount,
            long availableDoctorCount,
            long totalAppointmentCount,
            List<StatusCountResponse> appointmentCounts,
            List<StatusCountResponse> policyCounts,
            List<StatusCountResponse> claimCounts,
            long successfulPaymentCount,
            long failedPaymentCount,
            BigDecimal totalSuccessfulPaymentAmount,
            long unreadNotificationCount,
            List<DashboardAppointmentSummary> recentAppointments,
            List<DashboardClaimSummary> recentClaims,
            List<DashboardPaymentSummary> recentSuccessfulPayments,
            String averageSettlementTime) {

        this.totalPatientCount = totalPatientCount;
        this.totalDoctorCount = totalDoctorCount;
        this.availableDoctorCount = availableDoctorCount;
        this.totalAppointmentCount = totalAppointmentCount;
        this.appointmentCounts = appointmentCounts;
        this.policyCounts = policyCounts;
        this.claimCounts = claimCounts;
        this.successfulPaymentCount = successfulPaymentCount;
        this.failedPaymentCount = failedPaymentCount;
        this.totalSuccessfulPaymentAmount = totalSuccessfulPaymentAmount;
        this.unreadNotificationCount = unreadNotificationCount;
        this.recentAppointments = recentAppointments;
        this.recentClaims = recentClaims;
        this.recentSuccessfulPayments = recentSuccessfulPayments;
        this.averageSettlementTime = averageSettlementTime;
    }

    public long getTotalPatientCount() {
        return totalPatientCount;
    }

    public long getTotalDoctorCount() {
        return totalDoctorCount;
    }

    public long getAvailableDoctorCount() {
        return availableDoctorCount;
    }

    public long getTotalAppointmentCount() {
        return totalAppointmentCount;
    }

    public List<StatusCountResponse> getAppointmentCounts() {
        return appointmentCounts;
    }

    public List<StatusCountResponse> getPolicyCounts() {
        return policyCounts;
    }

    public List<StatusCountResponse> getClaimCounts() {
        return claimCounts;
    }

    public long getSuccessfulPaymentCount() {
        return successfulPaymentCount;
    }

    public long getFailedPaymentCount() {
        return failedPaymentCount;
    }

    public BigDecimal getTotalSuccessfulPaymentAmount() {
        return totalSuccessfulPaymentAmount;
    }

    public long getUnreadNotificationCount() {
        return unreadNotificationCount;
    }

    public List<DashboardAppointmentSummary> getRecentAppointments() {
        return recentAppointments;
    }

    public List<DashboardClaimSummary> getRecentClaims() {
        return recentClaims;
    }

    public List<DashboardPaymentSummary> getRecentSuccessfulPayments() {
        return recentSuccessfulPayments;
    }

    public String getAverageSettlementTime() {
        return averageSettlementTime;
    }
}