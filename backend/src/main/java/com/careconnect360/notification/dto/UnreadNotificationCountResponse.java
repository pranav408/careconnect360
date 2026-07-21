package com.careconnect360.notification.dto;

public class UnreadNotificationCountResponse {

    private final long unreadCount;

    public UnreadNotificationCountResponse(long unreadCount) {
        this.unreadCount = unreadCount;
    }

    public long getUnreadCount() {
        return unreadCount;
    }
}