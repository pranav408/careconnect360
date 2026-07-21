package com.careconnect360.auth.service;

import java.util.Locale;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.dto.CurrentUserResponse;
import com.careconnect360.auth.dto.LoginRequest;
import com.careconnect360.auth.dto.LoginResponse;
import com.careconnect360.auth.dto.RegisterPatientRequest;
import com.careconnect360.auth.dto.RegisterPatientResponse;
import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.auth.security.JwtService;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    @Transactional
    public RegisterPatientResponse registerPatient(
            RegisterPatientRequest request) {

        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException(
                    "An account already exists with this email");
        }

        String encodedPassword =
                passwordEncoder.encode(request.getPassword());

        User user = new User(
                normalizedEmail,
                encodedPassword,
                UserRole.PATIENT,
                AccountStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        Patient patient = new Patient(
                savedUser,
                request.getFullName().trim(),
                request.getPhone().trim());

        patient.setAddress(blankToNull(request.getAddress()));
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());

        Patient savedPatient =
                patientRepository.save(patient);

        return new RegisterPatientResponse(
                savedUser.getId(),
                savedPatient.getId(),
                savedUser.getEmail(),
                savedPatient.getFullName(),
                savedUser.getRole().name(),
                savedUser.getStatus().name(),
                "Patient registered successfully");
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {

        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        normalizedEmail,
                        request.getPassword()));

        User user = userRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "User account was not found"));

        String accessToken =
                jwtService.generateToken(user);

        return new LoginResponse(
                accessToken,
                "Bearer",
                jwtService.getExpirationSeconds(),
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name(),
                "Login successful");
    }

    @Transactional(readOnly = true)
    public CurrentUserResponse getCurrentUser(String email) {

        User user = userRepository
                .findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Authenticated user was not found"));

        return new CurrentUserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getStatus().name());
    }

    private String blankToNull(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}