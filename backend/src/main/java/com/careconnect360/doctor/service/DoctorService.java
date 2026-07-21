package com.careconnect360.doctor.service;

import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.DuplicateResourceException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.doctor.dto.CreateDoctorRequest;
import com.careconnect360.doctor.dto.CreateDoctorResponse;
import com.careconnect360.doctor.dto.DoctorProfileResponse;
import com.careconnect360.doctor.dto.DoctorSelfProfileResponse;
import com.careconnect360.doctor.dto.UpdateDoctorSelfProfileRequest;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.doctor.repository.DoctorSpecification;

@Service
public class DoctorService {

    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    public DoctorService(
            UserRepository userRepository,
            DoctorRepository doctorRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.doctorRepository = doctorRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CreateDoctorResponse createDoctor(
            CreateDoctorRequest request) {

        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new DuplicateResourceException(
                    "An account already exists with this email");
        }

        String normalizedLicenseNumber = request.getLicenseNumber()
                .trim();

        if (doctorRepository.existsByLicenseNumberIgnoreCase(
                normalizedLicenseNumber)) {

            throw new DuplicateResourceException(
                    "A doctor profile already exists with this license number");
        }

        String encodedPassword =
                passwordEncoder.encode(request.getPassword());

        User user = new User(
                normalizedEmail,
                encodedPassword,
                UserRole.DOCTOR,
                AccountStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        Doctor doctor = new Doctor(
                savedUser,
                request.getFullName().trim(),
                request.getSpecialization().trim(),
                normalizedLicenseNumber,
                request.getPhone().trim(),
                request.getConsultationFee());

        doctor.setClinicAddress(blankToNull(request.getClinicAddress()));
        doctor.setAvailableForAppointments(true);

        Doctor savedDoctor = doctorRepository.save(doctor);

        return new CreateDoctorResponse(
                savedUser.getId(),
                savedDoctor.getId(),
                savedUser.getEmail(),
                savedDoctor.getFullName(),
                savedDoctor.getSpecialization(),
                savedDoctor.getLicenseNumber(),
                savedDoctor.getPhone(),
                savedDoctor.getClinicAddress(),
                savedDoctor.getConsultationFee(),
                savedDoctor.isAvailableForAppointments(),
                savedUser.getRole().name(),
                savedUser.getStatus().name(),
                "Doctor account created successfully");
    }

    @Transactional(readOnly = true)
    public Page<DoctorProfileResponse> searchDoctors(
            String name,
            String specialization,
            Boolean available,
            Integer page,
            Integer size,
            String sort) {

        Specification<Doctor> specification = DoctorSpecification.build(name, specialization, available);
        Pageable pageable = buildPageable(page, size, sort);
        Page<Doctor> doctorPage = doctorRepository.findAll(specification, pageable);

        return doctorPage.map(this::toProfileResponse);
    }

    @Transactional(readOnly = true)
    public DoctorProfileResponse getDoctorById(Long doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile was not found for id " + doctorId));
        return toProfileResponse(doctor);
    }

    @Transactional(readOnly = true)
    public DoctorSelfProfileResponse getCurrentProfile(Doctor doctor) {
        if (doctor == null) {
            throw new BadRequestException("Doctor profile is required");
        }

        return toSelfProfileResponse(doctor);
    }

    @Transactional
    public DoctorSelfProfileResponse updateCurrentProfile(
            Doctor doctor,
            UpdateDoctorSelfProfileRequest request) {

        if (doctor == null) {
            throw new BadRequestException("Doctor profile is required");
        }

        String fullName = blankToNull(request.getFullName());
        if (fullName == null) {
            throw new BadRequestException("Full name is required");
        }
        doctor.setFullName(fullName);

        String specialization = blankToNull(request.getSpecialization());
        if (specialization == null) {
            throw new BadRequestException("Specialization is required");
        }
        doctor.setSpecialization(specialization);

        String phone = blankToNull(request.getPhone());
        if (phone == null) {
            throw new BadRequestException("Phone number is required");
        }
        doctor.setPhone(phone);

        if (request.getConsultationFee() == null) {
            throw new BadRequestException("Consultation fee is required");
        }
        if (request.getConsultationFee().signum() < 0) {
            throw new BadRequestException("Consultation fee cannot be negative");
        }
        doctor.setConsultationFee(request.getConsultationFee());

        if (request.getAvailable() == null) {
            throw new BadRequestException("Availability is required");
        }
        doctor.setAvailableForAppointments(request.getAvailable());

        Doctor savedDoctor = doctorRepository.save(doctor);
        return toSelfProfileResponse(savedDoctor);
    }

    private DoctorProfileResponse toProfileResponse(Doctor doctor) {
        return new DoctorProfileResponse(
                doctor.getId(),
                doctor.getFullName(),
                doctor.getSpecialization(),
                doctor.getLicenseNumber(),
                doctor.getPhone(),
                doctor.getClinicAddress(),
                doctor.getConsultationFee(),
                doctor.isAvailableForAppointments());
    }

    private DoctorSelfProfileResponse toSelfProfileResponse(Doctor doctor) {
        User user = doctor.getUser();

        return new DoctorSelfProfileResponse(
                doctor.getId(),
                user != null ? user.getEmail() : null,
                doctor.getFullName(),
                doctor.getSpecialization(),
                doctor.getPhone(),
                doctor.getConsultationFee(),
                doctor.isAvailableForAppointments(),
                user != null && user.getStatus() != null ? user.getStatus().name() : null);
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

        String sortField = "fullName";
        Sort.Direction direction = Sort.Direction.ASC;

        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            if (parts.length == 2) {
                sortField = parts[0].trim();
                try {
                    direction = Sort.Direction.fromString(parts[1].trim());
                } catch (IllegalArgumentException ex) {
                    throw new BadRequestException("Sort direction must be 'asc' or 'desc'");
                }
            } else {
                throw new BadRequestException("Sort must be in the format field,direction");
            }
        }

        return PageRequest.of(pageNumber, pageSize, Sort.by(direction, sortField));
    }

    private String blankToNull(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
