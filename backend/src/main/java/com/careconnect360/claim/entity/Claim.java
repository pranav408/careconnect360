package com.careconnect360.claim.entity;

import java.math.BigDecimal;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.common.entity.BaseEntity;
import com.careconnect360.insurance.entity.InsurancePolicy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "claims",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_claims_appointment",
            columnNames = "appointment_id"
        )
    }
)
public class Claim extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "appointment_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_claims_appointment")
    )
    private Appointment appointment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "insurance_policy_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_claims_insurance_policy")
    )
    private InsurancePolicy insurancePolicy;

    @Column(
        name = "requested_amount",
        nullable = false,
        precision = 12,
        scale = 2
    )
    private BigDecimal requestedAmount;

    @Column(
        name = "approved_amount",
        precision = 12,
        scale = 2
    )
    private BigDecimal approvedAmount;

    @Column(
        name = "patient_responsibility",
        precision = 12,
        scale = 2
    )
    private BigDecimal patientResponsibility;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ClaimStatus status = ClaimStatus.SUBMITTED;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    protected Claim() {
    }

    public Claim(
            Appointment appointment,
            InsurancePolicy insurancePolicy,
            BigDecimal requestedAmount) {

        this.appointment = appointment;
        this.insurancePolicy = insurancePolicy;
        this.requestedAmount = requestedAmount;
        this.status = ClaimStatus.SUBMITTED;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public InsurancePolicy getInsurancePolicy() {
        return insurancePolicy;
    }

    public BigDecimal getRequestedAmount() {
        return requestedAmount;
    }

    public BigDecimal getApprovedAmount() {
        return approvedAmount;
    }

    public BigDecimal getPatientResponsibility() {
        return patientResponsibility;
    }

    public ClaimStatus getStatus() {
        return status;
    }

    public String getRejectionReason() {
        return rejectionReason;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }

    public void setInsurancePolicy(InsurancePolicy insurancePolicy) {
        this.insurancePolicy = insurancePolicy;
    }

    public void setRequestedAmount(BigDecimal requestedAmount) {
        this.requestedAmount = requestedAmount;
    }

    public void setApprovedAmount(BigDecimal approvedAmount) {
        this.approvedAmount = approvedAmount;
    }

    public void setPatientResponsibility(
            BigDecimal patientResponsibility) {

        this.patientResponsibility = patientResponsibility;
    }

    public void setStatus(ClaimStatus status) {
        this.status = status;
    }

    public void setRejectionReason(String rejectionReason) {
        this.rejectionReason = rejectionReason;
    }
}