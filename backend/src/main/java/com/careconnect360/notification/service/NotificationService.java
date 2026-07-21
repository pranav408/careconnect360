package com.careconnect360.notification.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.claim.entity.Claim;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.notification.dto.MarkAllNotificationsReadResponse;
import com.careconnect360.notification.dto.NotificationResponse;
import com.careconnect360.notification.dto.UnreadNotificationCountResponse;
import com.careconnect360.notification.entity.Notification;
import com.careconnect360.notification.enums.NotificationType;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.payment.entity.Payment;

@Service
public class NotificationService {

    private static final String DEFAULT_SORT = "createdAt,desc";
    private static final int TITLE_MAX_LENGTH = 150;
    private static final int MESSAGE_MAX_LENGTH = 1000;
    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ROOT);
    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notifyAppointmentRequested(Appointment appointment) {
        createNotification(
                appointment,
                NotificationType.APPOINTMENT_REQUESTED,
                "Appointment Requested",
                "Your appointment request with %s on %s at %s was submitted.");
    }

    @Transactional
    public void notifyAppointmentConfirmed(Appointment appointment) {
        createNotification(
                appointment,
                NotificationType.APPOINTMENT_CONFIRMED,
                "Appointment Confirmed",
                "Your appointment with %s on %s at %s has been confirmed.");
    }

    @Transactional
    public void notifyAppointmentRejected(Appointment appointment) {
        createNotification(
                appointment,
                NotificationType.APPOINTMENT_REJECTED,
                "Appointment Rejected",
                "Your appointment with %s on %s at %s was rejected.");
    }

    @Transactional
    public void notifyAppointmentCancelled(Appointment appointment) {
        createNotification(
                appointment,
                NotificationType.APPOINTMENT_CANCELLED,
                "Appointment Cancelled",
                "Your appointment with %s on %s at %s was cancelled.");
    }

    @Transactional
    public void notifyAppointmentCompleted(Appointment appointment) {
        createNotification(
                appointment,
                NotificationType.APPOINTMENT_COMPLETED,
                "Appointment Completed",
                "Your appointment with %s on %s at %s was marked as completed.");
    }

    @Transactional
    public void notifyClaimSubmitted(Claim claim) {
        createAndSave(
                claim.getAppointment().getPatient(),
                NotificationType.CLAIM_SUBMITTED,
                "Claim Submitted",
                "Claim #%d was submitted for processing.",
                "CLAIM",
                claim.getId());
    }

    @Transactional
    public void notifyClaimVerified(Claim claim) {
        createAndSave(
                claim.getAppointment().getPatient(),
                NotificationType.CLAIM_VERIFIED,
                "Claim Verified",
                "Claim #%d was verified and is under review.",
                "CLAIM",
                claim.getId());
    }

    @Transactional
    public void notifyClaimApproved(Claim claim) {
        String message = String.format(
                Locale.ROOT,
                "Claim #%d was approved. Insurance approved $%s and your responsibility is $%s.",
                claim.getId(),
                money(claim.getApprovedAmount()),
                money(claim.getPatientResponsibility()));

        createAndSave(
                claim.getAppointment().getPatient(),
                NotificationType.CLAIM_APPROVED,
                "Claim Approved",
                message,
                "CLAIM",
                claim.getId());
    }

    @Transactional
    public void notifyClaimRejected(Claim claim) {
        createAndSave(
                claim.getAppointment().getPatient(),
                NotificationType.CLAIM_REJECTED,
                "Claim Rejected",
                "Claim #%d was rejected.",
                "CLAIM",
                claim.getId());
    }

    @Transactional
    public void notifyClaimPaid(Claim claim) {
        createAndSave(
                claim.getAppointment().getPatient(),
                NotificationType.CLAIM_PAID,
                "Claim Paid",
                "Claim #%d is now marked as paid.",
                "CLAIM",
                claim.getId());
    }

    @Transactional
    public void notifyPaymentSuccess(Payment payment) {
        String message = String.format(
                Locale.ROOT,
                "Your payment of $%s was successful. Transaction reference: %s.",
                money(payment.getAmount()),
                payment.getTransactionReference());

        createAndSave(
                payment.getClaim().getAppointment().getPatient(),
                NotificationType.PAYMENT_SUCCESS,
                "Payment Successful",
                message,
                "PAYMENT",
                payment.getId());
    }

    @Transactional
    public void notifyPaymentFailure(Payment payment) {
        createAndSave(
                payment.getClaim().getAppointment().getPatient(),
                NotificationType.PAYMENT_FAILED,
                "Payment Failed",
                "Your payment of $%s failed.",
                "PAYMENT",
                payment.getId(),
                money(payment.getAmount()));
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> listNotificationsForPatient(
            Patient patient,
            NotificationType type,
            Boolean read,
            Integer page,
            Integer size,
            String sort) {

        if (patient == null || patient.getUser() == null || patient.getUser().getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        Pageable pageable = buildPageable(page, size, sort);
        return notificationRepository.findNotificationsForRecipient(
                        patient.getUser().getId(),
                        type,
                        read,
                        pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public UnreadNotificationCountResponse getUnreadCountForPatient(Patient patient) {
        if (patient == null || patient.getUser() == null || patient.getUser().getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        long unreadCount = notificationRepository.countByRecipientIdAndReadStatusFalse(
                patient.getUser().getId());

        return new UnreadNotificationCountResponse(unreadCount);
    }

    @Transactional
    public NotificationResponse markNotificationAsRead(Patient patient, Long notificationId) {
        if (patient == null || patient.getUser() == null || patient.getUser().getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }
        if (notificationId == null) {
            throw new BadRequestException("Notification id is required");
        }

        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Notification was not found for id " + notificationId));

        if (!notification.getRecipient().getId().equals(patient.getUser().getId())) {
            throw new ForbiddenOperationException(
                    "You are not allowed to modify this notification");
        }

        if (!notification.isReadStatus()) {
            notification.setReadStatus(true);
            notification.setReadAt(LocalDateTime.now());
            notification = notificationRepository.save(notification);
        }

        return mapToResponse(notification);
    }

    @Transactional
    public MarkAllNotificationsReadResponse markAllNotificationsAsRead(Patient patient) {
        if (patient == null || patient.getUser() == null || patient.getUser().getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        int updatedCount = notificationRepository.markAllUnreadAsRead(
                patient.getUser().getId(),
                LocalDateTime.now());

        return new MarkAllNotificationsReadResponse(updatedCount);
    }

    private void createNotification(
            Appointment appointment,
            NotificationType type,
            String title,
            String messageTemplate) {

        String doctorName = appointment.getDoctor() != null
                ? appointment.getDoctor().getFullName()
                : "your doctor";
        String date = appointment.getAppointmentDate() != null
                ? appointment.getAppointmentDate().format(DATE_FORMATTER)
                : "N/A";
        String time = appointment.getAppointmentTime() != null
                ? appointment.getAppointmentTime().format(TIME_FORMATTER)
                : "N/A";

        String message = String.format(
                Locale.ROOT,
                messageTemplate,
                doctorName,
                date,
                time);

        createAndSave(
                appointment.getPatient(),
                type,
                title,
                message,
                "APPOINTMENT",
                appointment.getId());
    }

    private void createAndSave(
            Patient patient,
            NotificationType type,
            String title,
            String messageTemplate,
            String relatedEntityType,
            Long relatedEntityId,
            Object... args) {

        if (patient == null || patient.getUser() == null) {
            throw new BadRequestException("Notification recipient is required");
        }

        String message = args == null || args.length == 0
                ? messageTemplate
                : String.format(Locale.ROOT, messageTemplate, args);

        Notification notification = new Notification(
                patient.getUser(),
                type,
                truncate(title, TITLE_MAX_LENGTH),
                truncate(message, MESSAGE_MAX_LENGTH),
                relatedEntityType,
                relatedEntityId);

        notificationRepository.save(notification);
    }

    private NotificationResponse mapToResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isReadStatus(),
                notification.getReadAt(),
                notification.getEmailDeliveryStatus(),
                notification.getCreatedAt(),
                notification.getUpdatedAt());
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }

        return trimmed.substring(0, maxLength - 3) + "...";
    }

    private String money(BigDecimal amount) {
        if (amount == null) {
            return "0.00";
        }

        return amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private Pageable buildPageable(Integer page, Integer size, String sort) {
        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;

        if (pageNumber < 0) {
            throw new BadRequestException("Page index must be greater than or equal to 0");
        }
        if (pageSize < 1) {
            throw new BadRequestException("Page size must be greater than 0");
        }

        String sortValue = sort == null || sort.isBlank() ? DEFAULT_SORT : sort.trim();
        String[] parts = sortValue.split(",", -1);
        if (parts.length != 2) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        String sortField = toSortField(parts[0].trim());
        String sortDirectionValue = parts[1].trim().toLowerCase(Locale.ROOT);
        if (sortField.isBlank() || sortDirectionValue.isBlank()) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        Sort.Direction direction;
        if ("asc".equals(sortDirectionValue)) {
            direction = Sort.Direction.ASC;
        } else if ("desc".equals(sortDirectionValue)) {
            direction = Sort.Direction.DESC;
        } else {
            throw new BadRequestException("Invalid sort direction. Supported values are asc or desc");
        }

        Sort primarySort = Sort.by(direction, sortField);
        if (!"createdAt".equals(sortField)) {
            primarySort = primarySort.and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return PageRequest.of(pageNumber, pageSize, primarySort);
    }

    private String toSortField(String sortField) {
        return switch (sortField) {
            case "createdAt" -> "createdAt";
            case "type" -> "type";
            case "read" -> "readStatus";
            case "readAt" -> "readAt";
            default -> throw new BadRequestException("Unsupported sort field: " + sortField);
        };
    }
}