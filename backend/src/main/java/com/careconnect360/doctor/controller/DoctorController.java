package com.careconnect360.doctor.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.doctor.dto.DoctorProfileResponse;
import com.careconnect360.doctor.dto.DoctorSelfProfileResponse;
import com.careconnect360.doctor.dto.UpdateDoctorSelfProfileRequest;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.service.DoctorService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/doctors")
@SecurityRequirement(name = "bearerAuth")
public class DoctorController {

    private final DoctorService doctorService;
    private final AuthenticatedUserService authenticatedUserService;

    public DoctorController(
            DoctorService doctorService,
            AuthenticatedUserService authenticatedUserService) {

        this.doctorService = doctorService;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Operation(
        summary = "List doctors",
        description = "Returns a safe paginated doctor directory with optional filters.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Doctor directory returned", content = @Content(schema = @Schema(implementation = DoctorProfileResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "400", description = "Invalid pagination or filter input")
        }
    )
    @GetMapping
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR','ADMIN')")
    public ResponseEntity<Page<DoctorProfileResponse>> listDoctors(
            @Parameter(description = "Partial case-insensitive doctor name search")
            @RequestParam(required = false) String name,
            @Parameter(description = "Partial case-insensitive specialization search")
            @RequestParam(required = false) String specialization,
            @Parameter(description = "Filter to doctors accepting appointments")
            @RequestParam(required = false) Boolean available,
            @Parameter(description = "Zero-based page index")
            @RequestParam(defaultValue = "0") Integer page,
            @Parameter(description = "Page size")
            @RequestParam(defaultValue = "10") Integer size,
            @Parameter(description = "Sort in field,direction format, e.g. fullName,asc")
            @RequestParam(defaultValue = "fullName,asc") String sort) {

        Page<DoctorProfileResponse> response = doctorService.searchDoctors(
                name,
                specialization,
                available,
                page,
                size,
                sort);

        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Get doctor detail",
        description = "Returns a safe doctor profile for a specific doctor ID.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Doctor profile returned", content = @Content(schema = @Schema(implementation = DoctorProfileResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "404", description = "Doctor not found")
        }
    )
    @GetMapping("/{doctorId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR','ADMIN')")
    public ResponseEntity<DoctorProfileResponse> getDoctorDetail(
            @Parameter(description = "Doctor identifier")
            @PathVariable Long doctorId) {

        DoctorProfileResponse response = doctorService.getDoctorById(doctorId);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Get authenticated doctor profile",
        description = "Returns the authenticated doctor's own profile.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Doctor profile returned", content = @Content(schema = @Schema(implementation = DoctorSelfProfileResponse.class))),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required"),
            @ApiResponse(responseCode = "404", description = "Doctor profile not found")
        }
    )
    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorSelfProfileResponse> getCurrentDoctorProfile(
            Authentication authentication) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        DoctorSelfProfileResponse response = doctorService.getCurrentProfile(doctor);
        return ResponseEntity.ok(response);
    }

    @Operation(
        summary = "Update authenticated doctor profile",
        description = "Updates editable fields for the authenticated doctor's own profile.",
        responses = {
            @ApiResponse(responseCode = "200", description = "Doctor profile updated", content = @Content(schema = @Schema(implementation = DoctorSelfProfileResponse.class))),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "401", description = "Authentication required"),
            @ApiResponse(responseCode = "403", description = "Doctor role required"),
            @ApiResponse(responseCode = "404", description = "Doctor profile not found")
        }
    )
    @PutMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<DoctorSelfProfileResponse> updateCurrentDoctorProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateDoctorSelfProfileRequest request) {

        Doctor doctor = authenticatedUserService.getCurrentDoctor(authentication);
        DoctorSelfProfileResponse response = doctorService.updateCurrentProfile(doctor, request);
        return ResponseEntity.ok(response);
    }
}
