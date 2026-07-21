package com.careconnect360.patient.service;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.patient.dto.PatientProfileResponse;
import com.careconnect360.patient.dto.UpdatePatientProfileRequest;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;

import jakarta.validation.Valid;

@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Transactional(readOnly = true)
    public PatientProfileResponse getCurrentProfile(Patient patient) {
        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        return mapToResponse(patient);
    }

    @Transactional
    public PatientProfileResponse updateCurrentProfile(
            Patient patient,
            @Valid UpdatePatientProfileRequest request) {

        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        String fullName = blankToNull(request.getFullName());
        if (fullName == null) {
            throw new BadRequestException("Full name is required");
        }
        patient.setFullName(fullName.trim());

        String phone = blankToNull(request.getPhone());
        if (phone == null) {
            throw new BadRequestException("Phone number is required");
        }
        patient.setPhone(phone.trim());

        patient.setAddress(blankToNull(request.getAddress()));
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setGender(request.getGender());

        Patient savedPatient = patientRepository.save(patient);
        return mapToResponse(savedPatient);
    }

    private PatientProfileResponse mapToResponse(Patient patient) {
        User user = patient.getUser();

        return new PatientProfileResponse(
                patient.getId(),
                user != null ? user.getEmail() : null,
                patient.getFullName(),
                patient.getPhone(),
                patient.getAddress(),
                patient.getDateOfBirth(),
                patient.getGender(),
                user != null && user.getStatus() != null
                        ? user.getStatus().name()
                        : null);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
