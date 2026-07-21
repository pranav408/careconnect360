package com.careconnect360.notification.repository;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.careconnect360.notification.entity.Notification;
import com.careconnect360.notification.enums.EmailDeliveryStatus;
import com.careconnect360.notification.enums.NotificationType;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    List<Notification>
        findByRecipientIdOrderByCreatedAtDesc(
            Long recipientId);

    List<Notification>
        findByRecipientIdAndReadStatusFalseOrderByCreatedAtDesc(
            Long recipientId);

    long countByRecipientIdAndReadStatusFalse(
            Long recipientId);

    long countByReadStatusFalse();

    List<Notification>
        findByEmailDeliveryStatusOrderByCreatedAtAsc(
            EmailDeliveryStatus emailDeliveryStatus);

    @Query(
        """
        SELECT n
        FROM Notification n
        WHERE n.recipient.id = :recipientId
          AND (:type IS NULL OR n.type = :type)
          AND (:readStatus IS NULL OR n.readStatus = :readStatus)
        """
    )
    Page<Notification> findNotificationsForRecipient(
            @Param("recipientId") Long recipientId,
            @Param("type") NotificationType type,
            @Param("readStatus") Boolean readStatus,
            Pageable pageable);

    @Modifying
    @Query(
        """
        UPDATE Notification n
           SET n.readStatus = true,
               n.readAt = :readAt
         WHERE n.recipient.id = :recipientId
           AND n.readStatus = false
        """
    )
    int markAllUnreadAsRead(
            @Param("recipientId") Long recipientId,
            @Param("readAt") java.time.LocalDateTime readAt);
}