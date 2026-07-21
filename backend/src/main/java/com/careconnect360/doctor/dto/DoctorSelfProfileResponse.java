package com.careconnect360.doctor.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DoctorSelfProfileResponse", description = "Authenticated doctor profile response")
public class DoctorSelfProfileResponse {

    @Schema(example = "10")
    private final Long doctorId;

    @Schema(example = "doctor@careconnect360.com")
    private final String email;

    @Schema(example = "Dr. Priya Sharma")
    private final String fullName;

    @Schema(example = "Cardiology")
    private final String specialization;

    @Schema(example = "5551234567")
    private final String phone;

    @Schema(example = "150.00")
    private final BigDecimal consultationFee;

    @Schema(example = "true")
    private final boolean available;

    @Schema(example = "ACTIVE")
    private final String accountStatus;

    public DoctorSelfProfileResponse(
            Long doctorId,
            String email,
            String fullName,
            String specialization,
            String phone,
            BigDecimal consultationFee,
            boolean available,
            String accountStatus) {

        this.doctorId = doctorId;
        this.email = email;
        this.fullName = fullName;
        this.specialization = specialization;
        this.phone = phone;
        this.consultationFee = consultationFee;
        this.available = available;
        this.accountStatus = accountStatus;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getSpecialization() {
        return specialization;
    }

    public String getPhone() {
        return phone;
    }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public boolean isAvailable() {
        return available;
    }

    public String getAccountStatus() {
        return accountStatus;
    }
}