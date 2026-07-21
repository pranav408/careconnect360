package com.careconnect360.appointment.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "CreateAppointmentRequest", description = "Payload for booking an appointment")
public class CreateAppointmentRequest {

    @NotNull(message = "Doctor id is required")
    @Schema(example = "1")
    private Long doctorId;

    @NotNull(message = "Appointment date is required")
    @FutureOrPresent(message = "Appointment date cannot be in the past")
    @Schema(example = "2026-08-20")
    private LocalDate appointmentDate;

    @NotNull(message = "Appointment time is required")
    @Schema(example = "10:30:00")
    private LocalTime appointmentTime;

    @NotBlank(message = "Reason is required")
    @Size(max = 500, message = "Reason cannot exceed 500 characters")
    @Schema(example = "Routine check-up")
    private String reason;

    public CreateAppointmentRequest() {
    }

    public Long getDoctorId() {
        return doctorId;
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

    public void setDoctorId(Long doctorId) {
        this.doctorId = doctorId;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public void setAppointmentTime(LocalTime appointmentTime) {
        this.appointmentTime = appointmentTime;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
