package com.careconnect360.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "StatusCountResponse", description = "Count summary for a workflow status")
public class StatusCountResponse {

    @Schema(example = "APPROVED")
    private final String status;

    @Schema(example = "3")
    private final long count;

    public StatusCountResponse(String status, long count) {
        this.status = status;
        this.count = count;
    }

    public String getStatus() {
        return status;
    }

    public long getCount() {
        return count;
    }
}