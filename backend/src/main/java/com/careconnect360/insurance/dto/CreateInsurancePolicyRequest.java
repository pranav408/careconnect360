package com.careconnect360.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "CreateInsurancePolicyRequest", description = "Payload for submitting an insurance policy")
public class CreateInsurancePolicyRequest {

    @NotBlank(message = "Policy number is required")
    @Size(max = 80, message = "Policy number cannot exceed 80 characters")
    @Schema(example = "POL-1001")
    private String policyNumber;

    @NotBlank(message = "Provider name is required")
    @Size(max = 120, message = "Provider name cannot exceed 120 characters")
    @Schema(example = "Blue Cross")
    private String providerName;

    @NotNull(message = "Coverage percentage is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Coverage percentage cannot be negative")
    @DecimalMax(value = "100.00", inclusive = true, message = "Coverage percentage cannot be greater than 100")
    @Schema(example = "85.00")
    private BigDecimal coveragePercentage;

    @NotNull(message = "Deductible amount is required")
    @DecimalMin(value = "0.00", inclusive = true, message = "Deductible amount cannot be negative")
    @Schema(example = "250.00")
    private BigDecimal deductibleAmount;

    @NotNull(message = "Start date is required")
    @Schema(example = "2026-01-01")
    private LocalDate startDate;

    @NotNull(message = "End date is required")
    @Schema(example = "2026-12-31")
    private LocalDate endDate;

    public CreateInsurancePolicyRequest() {
    }

    @AssertTrue(message = "End date must be after start date")
    public boolean isDateRangeValid() {
        return startDate == null || endDate == null || endDate.isAfter(startDate);
    }

    public String getPolicyNumber() {
        return policyNumber;
    }

    public String getProviderName() {
        return providerName;
    }

    public BigDecimal getCoveragePercentage() {
        return coveragePercentage;
    }

    public BigDecimal getDeductibleAmount() {
        return deductibleAmount;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setPolicyNumber(String policyNumber) {
        this.policyNumber = policyNumber;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public void setCoveragePercentage(BigDecimal coveragePercentage) {
        this.coveragePercentage = coveragePercentage;
    }

    public void setDeductibleAmount(BigDecimal deductibleAmount) {
        this.deductibleAmount = deductibleAmount;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}
