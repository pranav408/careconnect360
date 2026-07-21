package com.careconnect360.notification.entity;

import java.time.LocalDateTime;

import com.careconnect360.auth.entity.User;
import com.careconnect360.common.entity.BaseEntity;
import com.careconnect360.notification.enums.EmailDeliveryStatus;
import com.careconnect360.notification.enums.NotificationType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(
    name = "notifications",
    indexes = {
        @Index(
            name = "idx_notifications_recipient_read",
            columnList = "recipient_id, is_read"
        )
    }
)
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "recipient_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_notifications_recipient")
    )
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean readStatus = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Enumerated(EnumType.STRING)
    @Column(
        name = "email_delivery_status",
        nullable = false,
        length = 30
    )
    private EmailDeliveryStatus emailDeliveryStatus =
            EmailDeliveryStatus.NOT_REQUESTED;

    @Column(name = "email_sent_at")
    private LocalDateTime emailSentAt;

    @Column(name = "email_failure_reason", length = 500)
    private String emailFailureReason;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    protected Notification() {
    }

    public Notification(
            User recipient,
            NotificationType type,
            String title,
            String message,
            String relatedEntityType,
            Long relatedEntityId) {

        this.recipient = recipient;
        this.type = type;
        this.title = title;
        this.message = message;
        this.relatedEntityType = relatedEntityType;
        this.relatedEntityId = relatedEntityId;
        this.readStatus = false;
        this.emailDeliveryStatus =
                EmailDeliveryStatus.NOT_REQUESTED;
    }

    public User getRecipient() {
        return recipient;
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

    public boolean isReadStatus() {
        return readStatus;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public EmailDeliveryStatus getEmailDeliveryStatus() {
        return emailDeliveryStatus;
    }

    public LocalDateTime getEmailSentAt() {
        return emailSentAt;
    }

    public String getEmailFailureReason() {
        return emailFailureReason;
    }

    public String getRelatedEntityType() {
        return relatedEntityType;
    }

    public Long getRelatedEntityId() {
        return relatedEntityId;
    }

    public void setRecipient(User recipient) {
        this.recipient = recipient;
    }

    public void setType(NotificationType type) {
        this.type = type;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public void setReadStatus(boolean readStatus) {
        this.readStatus = readStatus;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public void setEmailDeliveryStatus(
            EmailDeliveryStatus emailDeliveryStatus) {

        this.emailDeliveryStatus = emailDeliveryStatus;
    }

    public void setEmailSentAt(LocalDateTime emailSentAt) {
        this.emailSentAt = emailSentAt;
    }

    public void setEmailFailureReason(String emailFailureReason) {
        this.emailFailureReason = emailFailureReason;
    }

    public void setRelatedEntityType(String relatedEntityType) {
        this.relatedEntityType = relatedEntityType;
    }

    public void setRelatedEntityId(Long relatedEntityId) {
        this.relatedEntityId = relatedEntityId;
    }
}