package com.careconnect360.appointment.controller;

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

import com.careconnect360.appointment.dto.AppointmentResponse;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.service.AppointmentService;
import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.doctor.entity.Doctor;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/doctor/appointments")
@SecurityRequirement(name = "bearerAuth")
public class DoctorAppointmentController {

    private final AuthenticatedUserService authenticatedUserService;
    private final AppointmentService appointmentService;

    public DoctorAppointmentController(
            AuthenticatedUserService authenticatedUserService,
            AppointmentService appointmentService) {

        this.authenticatedUserService = authenticatedUserService;
        this.appointmentService = appointmentService;
    }

    @Operation(
        summary = "List assigned appointments",
        description = "Returns appointments assigned only to the authenticated doctor with optional status filtering and pagination.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointments returned", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required")
        }
    )
    @GetMapping
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<Page<AppointmentResponse>> listMyAppointments(
            Authentication authentication,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "appointmentDate,asc") String sort) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        Page<AppointmentResponse> response = appointmentService.listDoctorAppointments(
                doctor,
                status,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Confirm appointment",
        description = "Confirms a REQUESTED appointment assigned to the authenticated doctor.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointment confirmed", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required or assignment mismatch"),
            @ApiResponse(responseCode = "404", description = "Appointment not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{appointmentId}/confirm")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> confirmAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        AppointmentResponse response = appointmentService.confirmAppointment(doctor, appointmentId);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Reject appointment",
        description = "Rejects a REQUESTED appointment assigned to the authenticated doctor.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointment rejected", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required or assignment mismatch"),
            @ApiResponse(responseCode = "404", description = "Appointment not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{appointmentId}/reject")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> rejectAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        AppointmentResponse response = appointmentService.rejectAppointment(doctor, appointmentId);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Complete appointment",
        description = "Completes a CONFIRMED appointment assigned to the authenticated doctor.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointment completed", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required or assignment mismatch"),
            @ApiResponse(responseCode = "404", description = "Appointment not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{appointmentId}/complete")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<AppointmentResponse> completeAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        AppointmentResponse response = appointmentService.completeAppointment(doctor, appointmentId);
        return ResponseEntity.ok(response);
    }
}
