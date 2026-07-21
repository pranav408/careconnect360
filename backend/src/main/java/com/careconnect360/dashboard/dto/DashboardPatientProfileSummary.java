package com.careconnect360.dashboard.dto;

import java.time.LocalDate;

import com.careconnect360.patient.enums.Gender;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "DashboardPatientProfileSummary", description = "Safe patient profile summary for the dashboard")
public class DashboardPatientProfileSummary {

    @Schema(example = "1")
    private final Long patientId;

    @Schema(example = "patient@example.com")
    private final String email;

    @Schema(example = "Example Patient")
    private final String fullName;

    @Schema(example = "5551234567")
    private final String phone;

    @Schema(example = "100 Main Street")
    private final String address;

    @Schema(example = "1990-01-15")
    private final LocalDate dateOfBirth;

    @Schema(example = "FEMALE")
    private final Gender gender;

    @Schema(example = "ACTIVE")
    private final String accountStatus;

    public DashboardPatientProfileSummary(
            Long patientId,
            String email,
            String fullName,
            String phone,
            String address,
            LocalDate dateOfBirth,
            Gender gender,
            String accountStatus) {

        this.patientId = patientId;
        this.email = email;
        this.fullName = fullName;
        this.phone = phone;
        this.address = address;
        this.dateOfBirth = dateOfBirth;
        this.gender = gender;
        this.accountStatus = accountStatus;
    }

    public Long getPatientId() {
        return patientId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public String getAddress() {
        return address;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public Gender getGender() {
        return gender;
    }

    public String getAccountStatus() {
        return accountStatus;
    }
}