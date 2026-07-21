package com.careconnect360.dashboard.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.careconnect360.appointment.enums.AppointmentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DashboardAppointmentSummary", description = "Safe appointment summary for dashboard use")
public class DashboardAppointmentSummary {

    @Schema(example = "101")
    private final Long appointmentId;

    @Schema(example = "2026-08-20")
    private final LocalDate appointmentDate;

    @Schema(example = "10:30:00")
    private final LocalTime appointmentTime;

    @Schema(example = "Routine check-up")
    private final String reason;

    @Schema(example = "CONFIRMED")
    private final AppointmentStatus status;

    @Schema(example = "7")
    private final Long doctorId;

    @Schema(example = "Dr. Sarah Johnson")
    private final String doctorName;

    @Schema(example = "Cardiology")
    private final String doctorSpecialization;

    @Schema(example = "1")
    private final Long patientId;

    @Schema(example = "Example Patient")
    private final String patientName;

    @Schema(example = "2026-07-12T09:15:30")
    private final LocalDateTime createdAt;

    public DashboardAppointmentSummary(
            Long appointmentId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            String reason,
            AppointmentStatus status,
            Long doctorId,
            String doctorName,
            String doctorSpecialization,
            Long patientId,
            String patientName,
            LocalDateTime createdAt) {

        this.appointmentId = appointmentId;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.reason = reason;
        this.status = status;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.doctorSpecialization = doctorSpecialization;
        this.patientId = patientId;
        this.patientName = patientName;
        this.createdAt = createdAt;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public LocalTime getAppointmentTime() {
        return appointmentTime;
    }

    public String getReason() {
        return reason;
    }

    public AppointmentStatus getStatus() {
        return status;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public String getDoctorSpecialization() {
        return doctorSpecialization;
    }

    public Long getPatientId() {
        return patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}