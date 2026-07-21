package com.careconnect360.doctor.dto;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "UpdateDoctorSelfProfileRequest", description = "Authenticated doctor profile update payload")
public class UpdateDoctorSelfProfileRequest {

    @NotBlank(message = "Full name is required")
    @Size(max = 120, message = "Full name cannot exceed 120 characters")
    @Schema(example = "Dr. Priya Sharma")
    private String fullName;

    @NotBlank(message = "Specialization is required")
    @Size(max = 100, message = "Specialization cannot exceed 100 characters")
    @Schema(example = "Cardiology")
    private String specialization;

    @NotBlank(message = "Phone number is required")
    @Size(max = 20, message = "Phone number cannot exceed 20 characters")
    @Schema(example = "5551234567")
    private String phone;

    @NotNull(message = "Consultation fee is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Consultation fee cannot be negative")
    @Schema(example = "175.00")
    private BigDecimal consultationFee;

    @NotNull(message = "Availability is required")
    @Schema(example = "true")
    private Boolean available;

    public UpdateDoctorSelfProfileRequest() {
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

    public Boolean getAvailable() {
        return available;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setConsultationFee(BigDecimal consultationFee) {
        this.consultationFee = consultationFee;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }
}