package com.careconnect360.insurance.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(name = "RejectInsurancePolicyRequest", description = "Admin rejection payload for an insurance policy")
public class RejectInsurancePolicyRequest {

    @NotBlank(message = "Rejection reason is required")
    @Size(max = 255, message = "Rejection reason cannot exceed 255 characters")
    @Schema(example = "Insufficient documentation")
    private String reason;

    public RejectInsurancePolicyRequest() {
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
