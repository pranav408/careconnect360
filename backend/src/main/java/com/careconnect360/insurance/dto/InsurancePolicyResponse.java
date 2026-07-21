package com.careconnect360.insurance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.careconnect360.insurance.enums.PolicyStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "InsurancePolicyResponse", description = "Safe insurance policy details")
public class InsurancePolicyResponse {

    @Schema(example = "1")
    private final Long policyId;

    @Schema(example = "POL-1001")
    private final String policyNumber;

    @Schema(example = "Blue Cross")
    private final String providerName;

    @Schema(example = "85.00")
    private final BigDecimal coveragePercentage;

    @Schema(example = "250.00")
    private final BigDecimal deductibleAmount;

    @Schema(example = "2026-01-01")
    private final LocalDate startDate;

    @Schema(example = "2026-12-31")
    private final LocalDate endDate;

    @Schema(example = "PENDING")
    private final PolicyStatus status;

    public InsurancePolicyResponse(
            Long policyId,
            String policyNumber,
            String providerName,
            BigDecimal coveragePercentage,
            BigDecimal deductibleAmount,
            LocalDate startDate,
            LocalDate endDate,
            PolicyStatus status) {

        this.policyId = policyId;
        this.policyNumber = policyNumber;
        this.providerName = providerName;
        this.coveragePercentage = coveragePercentage;
        this.deductibleAmount = deductibleAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status;
    }

    public Long getPolicyId() {
        return policyId;
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

    public PolicyStatus getStatus() {
        return status;
    }
}
