package com.careconnect360.appointment.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import com.careconnect360.appointment.enums.AppointmentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "AppointmentResponse", description = "Safe appointment details")
public class AppointmentResponse {

    @Schema(example = "101")
    private final Long appointmentId;

    @Schema(example = "11")
    private final Long patientId;

    @Schema(example = "Anita Rao")
    private final String patientName;

    @Schema(example = "7")
    private final Long doctorId;

    @Schema(example = "Dr. Sarah Johnson")
    private final String doctorName;

    @Schema(example = "Cardiology")
    private final String doctorSpecialization;

    @Schema(example = "2026-08-20")
    private final LocalDate appointmentDate;

    @Schema(example = "10:30:00")
    private final LocalTime appointmentTime;

    @Schema(example = "Routine check-up")
    private final String reason;

    @Schema(example = "REQUESTED")
    private final AppointmentStatus status;

    @Schema(example = "2026-07-12T09:15:30")
    private final LocalDateTime createdAt;

    public AppointmentResponse(
            Long appointmentId,
            Long patientId,
            String patientName,
            Long doctorId,
            String doctorName,
            String doctorSpecialization,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            String reason,
            AppointmentStatus status,
            LocalDateTime createdAt) {

        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.patientName = patientName;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.doctorSpecialization = doctorSpecialization;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.reason = reason;
        this.status = status;
        this.createdAt = createdAt;
    }

    public Long getAppointmentId() {
        return appointmentId;
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

    public String getDoctorSpecialization() {
        return doctorSpecialization;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
