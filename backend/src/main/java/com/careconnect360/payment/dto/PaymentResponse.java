package com.careconnect360.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.careconnect360.payment.enums.PaymentStatus;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "PaymentResponse", description = "Safe payment details")
public class PaymentResponse {

    @Schema(example = "25")
    private final Long paymentId;

    @Schema(example = "42")
    private final Long claimId;

    @Schema(example = "101")
    private final Long appointmentId;

    @Schema(example = "CC360-PAY-3fa85f64-5717-4562-b3fc-2c963f66afa6")
    private final String transactionReference;

    @Schema(example = "70.00")
    private final BigDecimal amount;

    @Schema(example = "SUCCESS")
    private final PaymentStatus status;

    @Schema(example = "2026-07-12T14:20:00")
    private final LocalDateTime paidAt;

    @Schema(example = "Simulated bank decline")
    private final String failureReason;

    @Schema(example = "2026-07-12T14:19:30")
    private final LocalDateTime createdAt;

    @Schema(example = "2026-07-12T14:20:00")
    private final LocalDateTime updatedAt;

    public PaymentResponse(
            Long paymentId,
            Long claimId,
            Long appointmentId,
            String transactionReference,
            BigDecimal amount,
            PaymentStatus status,
            LocalDateTime paidAt,
            String failureReason,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.paymentId = paymentId;
        this.claimId = claimId;
        this.appointmentId = appointmentId;
        this.transactionReference = transactionReference;
        this.amount = amount;
        this.status = status;
        this.paidAt = paidAt;
        this.failureReason = failureReason;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public Long getClaimId() {
        return claimId;
    }

    public Long getAppointmentId() {
        return appointmentId;
    }

    public String getTransactionReference() {
        return transactionReference;
    }

    public BigDecimal getAmount() {
        return amount;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
