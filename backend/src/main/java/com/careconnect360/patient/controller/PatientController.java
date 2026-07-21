package com.careconnect360.patient.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.careconnect360.auth.service.AuthenticatedUserService;
import com.careconnect360.patient.dto.PatientProfileResponse;
import com.careconnect360.patient.dto.UpdatePatientProfileRequest;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.service.PatientService;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/patients")
@SecurityRequirement(name = "bearerAuth")
public class PatientController {

    private final AuthenticatedUserService authenticatedUserService;
    private final PatientService patientService;

    public PatientController(
            AuthenticatedUserService authenticatedUserService,
            PatientService patientService) {

        this.authenticatedUserService = authenticatedUserService;
        this.patientService = patientService;
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientProfileResponse> getCurrentProfile(
            Authentication authentication) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        PatientProfileResponse response = patientService.getCurrentProfile(patient);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<PatientProfileResponse> updateCurrentProfile(
            Authentication authentication,
            @Valid @RequestBody UpdatePatientProfileRequest request) {

        Patient patient = authenticatedUserService.getCurrentPatient(authentication);
        PatientProfileResponse response = patientService.updateCurrentProfile(patient, request);
        return ResponseEntity.ok(response);
    }
}
