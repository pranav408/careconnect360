package com.careconnect360.doctor.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DoctorProfileResponse", description = "Safe doctor directory profile response")
public class DoctorProfileResponse {

    @Schema(example = "1")
    private final Long doctorId;

    @Schema(example = "Dr. Sarah Johnson")
    private final String fullName;

    @Schema(example = "Cardiology")
    private final String specialization;

    @Schema(example = "LIC-1001")
    private final String licenseNumber;

    @Schema(example = "5551234567")
    private final String phone;

    @Schema(example = "100 Health Avenue")
    private final String clinicAddress;

    @Schema(example = "150.00")
    private final BigDecimal consultationFee;

    @Schema(example = "true")
    private final boolean availableForAppointments;

    public DoctorProfileResponse(
            Long doctorId,
            String fullName,
            String specialization,
            String licenseNumber,
            String phone,
            String clinicAddress,
            BigDecimal consultationFee,
            boolean availableForAppointments) {

        this.doctorId = doctorId;
        this.fullName = fullName;
        this.specialization = specialization;
        this.licenseNumber = licenseNumber;
        this.phone = phone;
        this.clinicAddress = clinicAddress;
        this.consultationFee = consultationFee;
        this.availableForAppointments = availableForAppointments;
    }

    public Long getDoctorId() {
        return doctorId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getSpecialization() {
        return specialization;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public String getPhone() {
        return phone;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public BigDecimal getConsultationFee() {
        return consultationFee;
    }

    public boolean isAvailableForAppointments() {
        return availableForAppointments;
    }
}
