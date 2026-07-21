package com.careconnect360.notification.dto;

public class MarkAllNotificationsReadResponse {

    private final int updatedCount;

    public MarkAllNotificationsReadResponse(int updatedCount) {
        this.updatedCount = updatedCount;
    }

    public int getUpdatedCount() {
        return updatedCount;
    }
}