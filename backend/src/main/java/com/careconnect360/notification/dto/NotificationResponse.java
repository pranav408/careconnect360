package com.careconnect360.notification.dto;

import java.time.LocalDateTime;

import com.careconnect360.notification.enums.EmailDeliveryStatus;
import com.careconnect360.notification.enums.NotificationType;

public class NotificationResponse {

    private final Long notificationId;
    private final NotificationType type;
    private final String title;
    private final String message;
    private final boolean read;
    private final LocalDateTime readAt;
    private final EmailDeliveryStatus emailStatus;
    private final LocalDateTime createdAt;
    private final LocalDateTime updatedAt;

    public NotificationResponse(
            Long notificationId,
            NotificationType type,
            String title,
            String message,
            boolean read,
            LocalDateTime readAt,
            EmailDeliveryStatus emailStatus,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {

        this.notificationId = notificationId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.read = read;
        this.readAt = readAt;
        this.emailStatus = emailStatus;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Long getNotificationId() {
        return notificationId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public boolean isRead() {
        return read;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public EmailDeliveryStatus getEmailStatus() {
        return emailStatus;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}