package com.careconnect360.auth.service;

import java.util.Locale;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;

@Service
public class AuthenticatedUserService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    public AuthenticatedUserService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            DoctorRepository doctorRepository) {

        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
    }

    @Transactional(readOnly = true)
    public User getCurrentUser(Authentication authentication) {
        String email = resolveAuthenticatedEmail(authentication);
        return getCurrentUserByEmail(email);
    }

    @Transactional(readOnly = true)
    public User getCurrentUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);

        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated user was not found"));
    }

    @Transactional(readOnly = true)
    public Patient getCurrentPatient(Authentication authentication) {
        User user = getCurrentUser(authentication);

        if (user.getRole() != UserRole.PATIENT) {
            throw new ForbiddenOperationException(
                    "Only patient users can resolve a patient profile");
        }

        return patientRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient profile was not found for the authenticated user"));
    }

    @Transactional(readOnly = true)
    public Doctor getCurrentDoctor(Authentication authentication) {
        User user = getCurrentUser(authentication);

        if (user.getRole() != UserRole.DOCTOR) {
            throw new ForbiddenOperationException(
                    "Only doctor users can resolve a doctor profile");
        }

        return doctorRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile was not found for the authenticated user"));
    }

    private String resolveAuthenticatedEmail(Authentication authentication) {
        if (authentication == null) {
            throw new AccessDeniedException("Authentication is required");
        }

        String name = authentication.getName();
        if (name == null || name.isBlank()) {
            throw new AccessDeniedException("Authentication is required");
        }

        return normalizeEmail(name);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new AccessDeniedException("Authentication is required");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
