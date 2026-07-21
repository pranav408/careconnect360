package com.careconnect360.appointment.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.appointment.dto.AppointmentResponse;
import com.careconnect360.appointment.dto.CreateAppointmentRequest;
import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.DuplicateResourceException;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.InvalidStatusTransitionException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.claim.service.ClaimService;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.notification.service.NotificationService;
import com.careconnect360.patient.entity.Patient;

@Service
public class AppointmentService {

    private static final List<AppointmentStatus> BLOCKING_STATUSES = List.of(
            AppointmentStatus.REQUESTED,
            AppointmentStatus.CONFIRMED);

    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final ClaimService claimService;
    private final NotificationService notificationService;

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            DoctorRepository doctorRepository,
            ClaimService claimService,
            NotificationService notificationService) {

        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
        this.claimService = claimService;
        this.notificationService = notificationService;
    }

    @Transactional
    public AppointmentResponse createAppointment(
            Patient patient,
            CreateAppointmentRequest request) {

        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }
        if (request == null) {
            throw new BadRequestException("Appointment request is required");
        }
        if (request.getDoctorId() == null) {
            throw new BadRequestException("Doctor id is required");
        }
        if (request.getAppointmentDate() == null) {
            throw new BadRequestException("Appointment date is required");
        }
        if (request.getAppointmentTime() == null) {
            throw new BadRequestException("Appointment time is required");
        }

        LocalDateTime scheduledAt = LocalDateTime.of(
                request.getAppointmentDate(),
                request.getAppointmentTime());

        if (!scheduledAt.isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Appointment date/time must be in the future");
        }

        String reason = blankToNull(request.getReason());
        if (reason == null) {
            throw new BadRequestException("Reason is required");
        }

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor profile was not found for id " + request.getDoctorId()));

        if (!doctor.isAvailableForAppointments()) {
            throw new DuplicateResourceException("Selected doctor is not available for appointments");
        }

        boolean doctorConflict = appointmentRepository.existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                doctor.getId(),
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                BLOCKING_STATUSES);

        if (doctorConflict) {
            throw new DuplicateResourceException("The selected doctor already has an active appointment at this date/time");
        }

        boolean patientConflict = appointmentRepository.existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
                patient.getId(),
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                BLOCKING_STATUSES);

        if (patientConflict) {
            throw new DuplicateResourceException("The patient already has an active appointment at this date/time");
        }

        Appointment appointment = new Appointment(
                patient,
                doctor,
                request.getAppointmentDate(),
                request.getAppointmentTime(),
                reason);

        appointment.setStatus(AppointmentStatus.REQUESTED);

        Appointment saved = appointmentRepository.save(appointment);
        notificationService.notifyAppointmentRequested(saved);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<AppointmentResponse> listPatientAppointments(
            Patient patient,
            AppointmentStatus status,
            Integer page,
            Integer size,
            String sort) {

        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        Pageable pageable = buildPageable(page, size, sort);
        Page<Appointment> appointments = status == null
                ? appointmentRepository.findByPatientId(patient.getId(), pageable)
                : appointmentRepository.findByPatientIdAndStatus(patient.getId(), status, pageable);

        return appointments.map(this::mapToResponse);
    }

    @Transactional
    public AppointmentResponse cancelAppointment(
            Patient patient,
            Long appointmentId) {

        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment was not found for id " + appointmentId));

        if (!appointment.getPatient().getId().equals(patient.getId())) {
            throw new ForbiddenOperationException(
                    "You are not allowed to cancel this appointment");
        }

        if (appointment.getStatus() != AppointmentStatus.REQUESTED
                && appointment.getStatus() != AppointmentStatus.CONFIRMED) {

            throw new InvalidStatusTransitionException(
                    "Only requested or confirmed appointments can be cancelled");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment saved = appointmentRepository.save(appointment);
        notificationService.notifyAppointmentCancelled(saved);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<AppointmentResponse> listDoctorAppointments(
            Doctor doctor,
            AppointmentStatus status,
            Integer page,
            Integer size,
            String sort) {

        if (doctor == null) {
            throw new BadRequestException("Doctor profile is required");
        }

        Pageable pageable = buildPageable(page, size, sort);
        Page<Appointment> appointments = status == null
                ? appointmentRepository.findByDoctorId(doctor.getId(), pageable)
                : appointmentRepository.findByDoctorIdAndStatus(doctor.getId(), status, pageable);

        return appointments.map(this::mapToResponse);
    }

    @Transactional
    public AppointmentResponse confirmAppointment(
            Doctor doctor,
            Long appointmentId) {

        Appointment appointment = validateDoctorAccess(doctor, appointmentId);

        if (appointment.getStatus() != AppointmentStatus.REQUESTED) {
            throw new InvalidStatusTransitionException(
                    "Only requested appointments can be confirmed");
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        Appointment saved = appointmentRepository.save(appointment);
        notificationService.notifyAppointmentConfirmed(saved);
        return mapToResponse(saved);
    }

    @Transactional
    public AppointmentResponse rejectAppointment(
            Doctor doctor,
            Long appointmentId) {

        Appointment appointment = validateDoctorAccess(doctor, appointmentId);

        if (appointment.getStatus() != AppointmentStatus.REQUESTED) {
            throw new InvalidStatusTransitionException(
                    "Only requested appointments can be rejected");
        }

        appointment.setStatus(AppointmentStatus.REJECTED);
        Appointment saved = appointmentRepository.save(appointment);
        notificationService.notifyAppointmentRejected(saved);
        return mapToResponse(saved);
    }

    @Transactional
    public AppointmentResponse completeAppointment(
            Doctor doctor,
            Long appointmentId) {

        Appointment appointment = validateDoctorAccess(doctor, appointmentId);

        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new InvalidStatusTransitionException(
                    "Only confirmed appointments can be completed");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED);
        Appointment saved = appointmentRepository.save(appointment);

        claimService.createSubmittedClaimForCompletedAppointment(saved);
        notificationService.notifyAppointmentCompleted(saved);
        return mapToResponse(saved);
    }

    private Appointment validateDoctorAccess(Doctor doctor, Long appointmentId) {
        if (doctor == null) {
            throw new BadRequestException("Doctor profile is required");
        }

        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Appointment was not found for id " + appointmentId));

        if (!appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new ForbiddenOperationException(
                    "You are not allowed to manage this appointment");
        }

        return appointment;
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getPatient() != null ? appointment.getPatient().getId() : null,
                appointment.getPatient() != null ? appointment.getPatient().getFullName() : null,
                appointment.getDoctor() != null ? appointment.getDoctor().getId() : null,
                appointment.getDoctor() != null ? appointment.getDoctor().getFullName() : null,
                appointment.getDoctor() != null ? appointment.getDoctor().getSpecialization() : null,
                appointment.getAppointmentDate(),
                appointment.getAppointmentTime(),
                appointment.getReason(),
                appointment.getStatus(),
                appointment.getCreatedAt());
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

        String sortField = "appointmentDate";
        Sort.Direction direction = Sort.Direction.DESC;

        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            if (parts.length != 2) {
                throw new BadRequestException("Sort must be in the format field,direction");
            }

            sortField = parts[0].trim();
            if (!"appointmentDate".equals(sortField)
                    && !"appointmentTime".equals(sortField)
                    && !"createdAt".equals(sortField)
                    && !"status".equals(sortField)) {
                throw new BadRequestException("Unsupported sort field: " + sortField);
            }

            try {
                direction = Sort.Direction.fromString(parts[1].trim());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Sort direction must be 'asc' or 'desc'");
            }
        }

        Sort primarySort = Sort.by(direction, sortField);

        if (!"appointmentTime".equals(sortField)) {
            primarySort = primarySort.and(Sort.by(direction, "appointmentTime"));
        }

        return PageRequest.of(pageNumber, pageSize, primarySort);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
