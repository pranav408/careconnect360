package com.careconnect360.notification.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.notification.dto.MarkAllNotificationsReadResponse;
import com.careconnect360.notification.dto.NotificationResponse;
import com.careconnect360.notification.dto.UnreadNotificationCountResponse;
import com.careconnect360.notification.enums.NotificationType;
import com.careconnect360.notification.service.NotificationService;
import com.careconnect360.patient.entity.Patient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/notifications")
@SecurityRequirement(name = "bearerAuth")
public class PatientNotificationController {

    private final AuthenticatedUserService authenticatedUserService;
    private final NotificationService notificationService;

    public PatientNotificationController(
            AuthenticatedUserService authenticatedUserService,
            NotificationService notificationService) {

        this.authenticatedUserService = authenticatedUserService;
        this.notificationService = notificationService;
    }

    @Operation(
        summary = "List my notifications",
        description = "Returns notifications for the authenticated PATIENT only, with optional type/read filters, pagination, and safe sorting.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Notifications returned",
                content = @Content(
                    schema = @Schema(implementation = NotificationResponse.class),
                    examples = @ExampleObject(
                        value = "{\"content\":[{\"notificationId\":12,\"type\":\"APPOINTMENT_CONFIRMED\",\"title\":\"Appointment Confirmed\",\"message\":\"Your appointment with Dr. Sarah Johnson on 2026-08-20 at 11:00 has been confirmed.\",\"read\":false,\"emailStatus\":\"NOT_REQUESTED\",\"createdAt\":\"2026-07-12T20:15:00\",\"updatedAt\":\"2026-07-12T20:15:00\"}],\"pageable\":{\"pageNumber\":0,\"pageSize\":10},\"totalElements\":1,\"totalPages\":1,\"last\":true,\"first\":true,\"size\":10,\"number\":0,\"numberOfElements\":1,\"empty\":false}"
                    )
                )
            ),
            @ApiResponse(responseCode = "400", description = "Invalid filter or sort", content = @Content(examples = @ExampleObject(value = "{\"status\":400,\"error\":\"Bad Request\",\"message\":\"Unsupported sort field: patientId\"}"))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Page<NotificationResponse>> listMyNotifications(
            Authentication authentication,
            @RequestParam(required = false) NotificationType type,
            @RequestParam(required = false) Boolean read,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        Page<NotificationResponse> response = notificationService.listNotificationsForPatient(
                patient,
                type,
                read,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Get my unread notification count",
        description = "Returns unread notification count for the authenticated PATIENT.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Unread count returned",
                content = @Content(
                    schema = @Schema(implementation = UnreadNotificationCountResponse.class),
                    examples = @ExampleObject(value = "{\"unreadCount\":3}")
                )
            ),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required")
        }
    )
    @GetMapping("/me/unread-count")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<UnreadNotificationCountResponse> unreadCount(
            Authentication authentication) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(notificationService.getUnreadCountForPatient(patient));
    }

    @Operation(
        summary = "Mark one notification as read",
        description = "Marks a notification as read when it belongs to the authenticated PATIENT. Operation is idempotent.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Notification marked as read",
                content = @Content(
                    schema = @Schema(implementation = NotificationResponse.class),
                    examples = @ExampleObject(
                        value = "{\"notificationId\":12,\"type\":\"APPOINTMENT_CONFIRMED\",\"title\":\"Appointment Confirmed\",\"message\":\"Your appointment with Dr. Sarah Johnson on 2026-08-20 at 11:00 has been confirmed.\",\"read\":true,\"readAt\":\"2026-07-12T20:30:00\",\"emailStatus\":\"NOT_REQUESTED\",\"createdAt\":\"2026-07-12T20:15:00\",\"updatedAt\":\"2026-07-12T20:30:00\"}"
                    )
                )
            ),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required or ownership mismatch"),
            @ApiResponse(responseCode = "404", description = "Notification not found")
        }
    )
    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<NotificationResponse> markRead(
            Authentication authentication,
            @PathVariable Long notificationId) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(notificationService.markNotificationAsRead(patient, notificationId));
    }

    @Operation(
        summary = "Mark all my unread notifications as read",
        description = "Marks only unread notifications of the authenticated PATIENT as read and returns the number of updated rows.",
        responses = {
            @ApiResponse(
                responseCode = "200",
                description = "Notifications updated",
                content = @Content(
                    schema = @Schema(implementation = MarkAllNotificationsReadResponse.class),
                    examples = @ExampleObject(value = "{\"updatedCount\":4}")
                )
            ),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required")
        }
    )
    @PatchMapping("/me/read-all")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<MarkAllNotificationsReadResponse> markAllRead(
            Authentication authentication) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        return ResponseEntity.ok(notificationService.markAllNotificationsAsRead(patient));
    }
}