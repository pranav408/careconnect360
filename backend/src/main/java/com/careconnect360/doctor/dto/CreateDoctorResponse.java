package com.careconnect360.doctor.dto;

import java.math.BigDecimal;

public class CreateDoctorResponse {

    private final Long userId;
    private final Long doctorId;
    private final String email;
    private final String fullName;
    private final String specialization;
    private final String licenseNumber;
    private final String phone;
    private final String clinicAddress;
    private final BigDecimal consultationFee;
    private final boolean availableForAppointments;
    private final String role;
    private final String status;
    private final String message;

    public CreateDoctorResponse(
            Long userId,
            Long doctorId,
            String email,
            String fullName,
            String specialization,
            String licenseNumber,
            String phone,
            String clinicAddress,
            BigDecimal consultationFee,
            boolean availableForAppointments,
            String role,
            String status,
            String message) {

        this.userId = userId;
        this.doctorId = doctorId;
        this.email = email;
        this.fullName = fullName;
        this.specialization = specialization;
        this.licenseNumber = licenseNumber;
        this.phone = phone;
        this.clinicAddress = clinicAddress;
        this.consultationFee = consultationFee;
        this.availableForAppointments = availableForAppointments;
        this.role = role;
        this.status = status;
        this.message = message;
    }

    public Long getUserId() {
        return userId;
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

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}