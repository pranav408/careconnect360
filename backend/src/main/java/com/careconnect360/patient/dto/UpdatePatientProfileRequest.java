package com.careconnect360.patient.dto;

import java.time.LocalDate;

import com.careconnect360.patient.enums.Gender;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

@Schema(name = "UpdatePatientProfileRequest", description = "Patient profile update payload")
public class UpdatePatientProfileRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name cannot exceed 120 characters")
    @Schema(example = "Example Patient")
    private String fullName;

    @NotBlank(message = "Phone number is required")
    @Size(min = 7, max = 20, message = "Phone number must contain between 7 and 20 characters")
    @Schema(example = "5551234567")
    private String phone;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    @Schema(example = "100 Main Street")
    private String address;

    @Past(message = "Date of birth must be in the past")
    @Schema(example = "1990-01-15")
    private LocalDate dateOfBirth;

    @Schema(example = "FEMALE")
    private Gender gender;

    public UpdatePatientProfileRequest() {
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

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }
}
