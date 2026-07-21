package com.careconnect360.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(name = "MockPaymentRequest", description = "Deterministic mock payment request")
public class MockPaymentRequest {

    public enum Outcome {
        SUCCESS,
        FAILURE
    }

    @NotNull(message = "Payment outcome is required")
    @Schema(example = "SUCCESS", allowableValues = { "SUCCESS", "FAILURE" })
    private Outcome outcome;

    @Size(max = 500, message = "Failure reason cannot exceed 500 characters")
    @Schema(example = "Simulated bank decline")
    private String failureReason;

    public Outcome getOutcome() {
        return outcome;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setOutcome(Outcome outcome) {
        this.outcome = outcome;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
}
