package com.careconnect360.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "PatientDashboardResponse", description = "Aggregated patient dashboard response")
public class PatientDashboardResponse {

    private final DashboardPatientProfileSummary profile;
    @JsonInclude(JsonInclude.Include.ALWAYS)
    private final DashboardPolicySummary activePolicy;
    private final List<DashboardAppointmentSummary> upcomingAppointments;
    private final List<StatusCountResponse> appointmentCounts;
    private final List<StatusCountResponse> claimCounts;
    @Schema(example = "70.00")
    private final BigDecimal outstandingPatientResponsibility;
    private final List<DashboardClaimSummary> recentClaims;
    private final List<DashboardPaymentSummary> recentPayments;
    @Schema(example = "3")
    private final long unreadNotificationCount;

    public PatientDashboardResponse(
            DashboardPatientProfileSummary profile,
            DashboardPolicySummary activePolicy,
            List<DashboardAppointmentSummary> upcomingAppointments,
            List<StatusCountResponse> appointmentCounts,
            List<StatusCountResponse> claimCounts,
            BigDecimal outstandingPatientResponsibility,
            List<DashboardClaimSummary> recentClaims,
            List<DashboardPaymentSummary> recentPayments,
            long unreadNotificationCount) {

        this.profile = profile;
        this.activePolicy = activePolicy;
        this.upcomingAppointments = upcomingAppointments;
        this.appointmentCounts = appointmentCounts;
        this.claimCounts = claimCounts;
        this.outstandingPatientResponsibility = outstandingPatientResponsibility;
        this.recentClaims = recentClaims;
        this.recentPayments = recentPayments;
        this.unreadNotificationCount = unreadNotificationCount;
    }

    public DashboardPatientProfileSummary getProfile() {
        return profile;
    }

    public DashboardPolicySummary getActivePolicy() {
        return activePolicy;
    }

    public List<DashboardAppointmentSummary> getUpcomingAppointments() {
        return upcomingAppointments;
    }

    public List<StatusCountResponse> getAppointmentCounts() {
        return appointmentCounts;
    }

    public List<StatusCountResponse> getClaimCounts() {
        return claimCounts;
    }

    public BigDecimal getOutstandingPatientResponsibility() {
        return outstandingPatientResponsibility;
    }

    public List<DashboardClaimSummary> getRecentClaims() {
        return recentClaims;
    }

    public List<DashboardPaymentSummary> getRecentPayments() {
        return recentPayments;
    }

    public long getUnreadNotificationCount() {
        return unreadNotificationCount;
    }
}