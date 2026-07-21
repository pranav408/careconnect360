package com.careconnect360.payment.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.careconnect360.claim.entity.Claim;
import com.careconnect360.common.entity.BaseEntity;
import com.careconnect360.payment.enums.PaymentStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
    name = "payments",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_payments_claim",
            columnNames = "claim_id"
        ),
        @UniqueConstraint(
            name = "uk_payments_transaction_reference",
            columnNames = "transaction_reference"
        )
    }
)
public class Payment extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "claim_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_payments_claim")
    )
    private Claim claim;

    @Column(
        nullable = false,
        precision = 12,
        scale = 2
    )
    private BigDecimal amount;

    @Column(
        name = "transaction_reference",
        nullable = false,
        length = 100
    )
    private String transactionReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.INITIATED;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    protected Payment() {
    }

    public Payment(
            Claim claim,
            BigDecimal amount,
            String transactionReference) {

        this.claim = claim;
        this.amount = amount;
        this.transactionReference = transactionReference;
        this.status = PaymentStatus.INITIATED;
    }

    public Claim getClaim() {
        return claim;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public LocalDateTime getPaidAt() {
        return paidAt;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setClaim(Claim claim) {
        this.claim = claim;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setTransactionReference(String transactionReference) {
        this.transactionReference = transactionReference;
    }

    public void setStatus(PaymentStatus status) {
        this.status = status;
    }

    public void setPaidAt(LocalDateTime paidAt) {
        this.paidAt = paidAt;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}