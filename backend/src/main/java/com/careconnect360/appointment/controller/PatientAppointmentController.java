package com.careconnect360.appointment.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.appointment.dto.AppointmentResponse;
import com.careconnect360.appointment.dto.CreateAppointmentRequest;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.service.AppointmentService;
import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.patient.entity.Patient;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
@SecurityRequirement(name = "bearerAuth")
public class PatientAppointmentController {

    private final AuthenticatedUserService authenticatedUserService;
    private final AppointmentService appointmentService;

    public PatientAppointmentController(
            AuthenticatedUserService authenticatedUserService,
            AppointmentService appointmentService) {

        this.authenticatedUserService = authenticatedUserService;
        this.appointmentService = appointmentService;
    }

    @Operation(
        summary = "Book appointment",
        description = "Creates an appointment request for the authenticated patient. Status is always forced to REQUESTED.",
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            required = true,
            content = @Content(
                schema = @Schema(implementation = CreateAppointmentRequest.class),
                examples = @ExampleObject(value = "{\"doctorId\":1,\"appointmentDate\":\"2026-08-20\",\"appointmentTime\":\"10:30:00\",\"reason\":\"Routine check-up\"}")))
        ,responses = {
            @ApiResponse(responseCode = "201", description = "Appointment created", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required"),
            @ApiResponse(responseCode = "404", description = "Doctor not found"),
            @ApiResponse(responseCode = "409", description = "Scheduling conflict or doctor availability conflict")
        }
    )
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<AppointmentResponse> createAppointment(
            Authentication authentication,
            @Valid @RequestBody CreateAppointmentRequest request) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        AppointmentResponse response = appointmentService.createAppointment(patient, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(
        summary = "List my appointments",
        description = "Returns appointments belonging only to the authenticated patient, with optional status filter and pagination.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointments returned", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<Page<AppointmentResponse>> listMyAppointments(
            Authentication authentication,
            @RequestParam(required = false) AppointmentStatus status,
            @RequestParam(defaultValue = "0") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(defaultValue = "appointmentDate,desc") String sort) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        Page<AppointmentResponse> response = appointmentService.listPatientAppointments(
                patient,
                status,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Cancel appointment",
        description = "Cancels an appointment owned by the authenticated patient when status is REQUESTED or CONFIRMED.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Appointment cancelled", content = @Content(schema = @Schema(implementation = AppointmentResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Patient role required or ownership mismatch"),
            @ApiResponse(responseCode = "404", description = "Appointment not found"),
            @ApiResponse(responseCode = "409", description = "Invalid status transition")
        }
    )
    @PatchMapping("/{appointmentId}/cancel")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            Authentication authentication,
            @PathVariable Long appointmentId) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        AppointmentResponse response = appointmentService.cancelAppointment(patient, appointmentId);
        return ResponseEntity.ok(response);
    }
}
