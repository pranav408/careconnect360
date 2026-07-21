package com.careconnect360.insurance.entity;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.careconnect360.common.entity.BaseEntity;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.patient.entity.Patient;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "insurance_policies",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_insurance_policy_number",
            columnNames = "policy_number"
        )
    }
)
public class InsurancePolicy extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "patient_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_insurance_policy_patient")
    )
    private Patient patient;

    @Column(name = "provider_name", nullable = false, length = 120)
    private String providerName;

    @Column(name = "policy_number", nullable = false, length = 80)
    private String policyNumber;

    @Column(
        name = "coverage_percentage",
        nullable = false,
        precision = 5,
        scale = 2
    )
    private BigDecimal coveragePercentage;

    @Column(
        name = "deductible_amount",
        nullable = false,
        precision = 12,
        scale = 2
    )
    private BigDecimal deductibleAmount;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PolicyStatus status = PolicyStatus.PENDING;

    protected InsurancePolicy() {
    }

    public InsurancePolicy(
            Patient patient,
            String providerName,
            String policyNumber,
            BigDecimal coveragePercentage,
            BigDecimal deductibleAmount,
            LocalDate startDate,
            LocalDate endDate) {

        this.patient = patient;
        this.providerName = providerName;
        this.policyNumber = policyNumber;
        this.coveragePercentage = coveragePercentage;
        this.deductibleAmount = deductibleAmount;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = PolicyStatus.PENDING;
    }

    public Patient getPatient() {
        return patient;
    }

    public String getProviderName() {
        return providerName;
    }

    public String getPolicyNumber() {
        return policyNumber;
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

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public void setProviderName(String providerName) {
        this.providerName = providerName;
    }

    public void setPolicyNumber(String policyNumber) {
        this.policyNumber = policyNumber;
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

    public void setStatus(PolicyStatus status) {
        this.status = status;
    }
}