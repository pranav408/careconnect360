package com.careconnect360.claim.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.claim.dto.ClaimResponse;
import com.careconnect360.claim.dto.RejectClaimRequest;
import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.claim.repository.ClaimSpecification;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.DuplicateResourceException;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.InvalidStatusTransitionException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.service.NotificationService;
import com.careconnect360.patient.entity.Patient;

@Service
public class ClaimService {

    private static final String DEFAULT_SORT = "createdAt,desc";
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

    private final ClaimRepository claimRepository;
    private final InsurancePolicyRepository insurancePolicyRepository;
    private final NotificationService notificationService;

    public ClaimService(
            ClaimRepository claimRepository,
            InsurancePolicyRepository insurancePolicyRepository,
            NotificationService notificationService) {

        this.claimRepository = claimRepository;
        this.insurancePolicyRepository = insurancePolicyRepository;
        this.notificationService = notificationService;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Claim createSubmittedClaimForCompletedAppointment(
            Appointment appointment) {

        if (appointment == null || appointment.getId() == null) {
            throw new BadRequestException("Completed appointment is required for claim creation");
        }

        if (claimRepository.existsByAppointmentId(appointment.getId())) {
            throw new DuplicateResourceException(
                    "A claim already exists for appointment id " + appointment.getId());
        }

        LocalDate appointmentDate = appointment.getAppointmentDate();
        if (appointmentDate == null) {
            throw new BadRequestException("Appointment date is required for claim creation");
        }

        InsurancePolicy validPolicy = insurancePolicyRepository
                .findFirstByPatientIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
                        appointment.getPatient().getId(),
                        PolicyStatus.ACTIVE,
                        appointmentDate,
                        appointmentDate)
                .orElseThrow(() -> new DuplicateResourceException(
                        "No active insurance policy is valid for the appointment date"));

        BigDecimal requestedAmount = scaleMoney(appointment.getDoctor().getConsultationFee());
        Claim claim = new Claim(appointment, validPolicy, requestedAmount);
        claim.setStatus(ClaimStatus.SUBMITTED);

        Claim saved = claimRepository.save(claim);
        notificationService.notifyClaimSubmitted(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<ClaimResponse> listClaimsForPatient(
            Patient patient,
            ClaimStatus status,
            Integer page,
            Integer size,
            String sort) {

        if (patient == null || patient.getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        Pageable pageable = buildPageable(page, size, sort);
        Page<Claim> claims = status == null
                ? claimRepository.findByAppointmentPatientId(patient.getId(), pageable)
                : claimRepository.findByAppointmentPatientIdAndStatus(patient.getId(), status, pageable);

        return claims.map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public ClaimResponse getClaimForPatient(Patient patient, Long claimId) {
        if (patient == null || patient.getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Claim was not found for id " + claimId));

        if (!claim.getAppointment().getPatient().getId().equals(patient.getId())) {
            throw new ForbiddenOperationException("You are not allowed to access this claim");
        }

        return mapToResponse(claim);
    }

    @Transactional(readOnly = true)
    public Page<ClaimResponse> listClaimsForAdmin(
            String status,
            String patientEmail,
            String policyNumber,
            Long appointmentId,
            Integer page,
            Integer size,
            String sort) {

        Pageable pageable = buildPageable(page, size, sort);
        ClaimStatus parsedStatus = parseOptionalStatus(status);

        Specification<Claim> specification = ClaimSpecification.build(
                parsedStatus,
                patientEmail,
                policyNumber,
                appointmentId);

        Page<Claim> claims = claimRepository.findAll(specification, pageable);
        return claims.map(this::mapToResponse);
    }

    @Transactional
    public ClaimResponse verifyClaim(Long claimId) {
        Claim claim = getClaimById(claimId);

        if (claim.getStatus() != ClaimStatus.SUBMITTED) {
            throw new InvalidStatusTransitionException(
                    "Only submitted claims may be verified");
        }

        claim.setStatus(ClaimStatus.VERIFIED);
        claim.setRejectionReason(null);
        Claim saved = claimRepository.save(claim);
        notificationService.notifyClaimVerified(saved);
        return mapToResponse(saved);
    }

    @Transactional
    public ClaimResponse approveClaim(Long claimId) {
        Claim claim = getClaimById(claimId);

        if (claim.getStatus() != ClaimStatus.VERIFIED) {
            throw new InvalidStatusTransitionException(
                    "Only verified claims may be approved");
        }

        BigDecimal requestedAmount = scaleMoney(claim.getRequestedAmount());
        BigDecimal deductibleAmount = scaleMoney(claim.getInsurancePolicy().getDeductibleAmount());

        BigDecimal eligibleAfterDeductible = requestedAmount.subtract(deductibleAmount);
        if (eligibleAfterDeductible.compareTo(BigDecimal.ZERO) < 0) {
            eligibleAfterDeductible = BigDecimal.ZERO;
        }
        eligibleAfterDeductible = scaleMoney(eligibleAfterDeductible);

        BigDecimal coverageRate = claim.getInsurancePolicy()
                .getCoveragePercentage()
                .divide(ONE_HUNDRED, 6, RoundingMode.HALF_UP);

        BigDecimal approvedAmount = eligibleAfterDeductible.multiply(coverageRate);
        approvedAmount = scaleMoney(approvedAmount);

        if (approvedAmount.compareTo(BigDecimal.ZERO) < 0) {
            approvedAmount = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (approvedAmount.compareTo(requestedAmount) > 0) {
            approvedAmount = requestedAmount;
        }

        BigDecimal patientResponsibility = requestedAmount.subtract(approvedAmount);
        if (patientResponsibility.compareTo(BigDecimal.ZERO) < 0) {
            patientResponsibility = BigDecimal.ZERO;
        }
        patientResponsibility = scaleMoney(patientResponsibility);

        // Keep accounting exact at 2-decimal precision.
        approvedAmount = requestedAmount.subtract(patientResponsibility)
                .setScale(2, RoundingMode.HALF_UP);

        claim.setApprovedAmount(approvedAmount);
        claim.setPatientResponsibility(patientResponsibility);
        claim.setStatus(ClaimStatus.APPROVED);
        claim.setRejectionReason(null);

        Claim saved = claimRepository.save(claim);
        notificationService.notifyClaimApproved(saved);
        return mapToResponse(saved);
    }

    @Transactional
    public ClaimResponse rejectClaim(Long claimId, RejectClaimRequest request) {
        Claim claim = getClaimById(claimId);

        if (claim.getStatus() != ClaimStatus.VERIFIED) {
            throw new InvalidStatusTransitionException(
                    "Only verified claims may be rejected");
        }

        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Rejection reason is required");
        }

        String reason = request.getReason().trim();
        if (reason.length() > 500) {
            throw new BadRequestException("Rejection reason cannot exceed 500 characters");
        }

        claim.setRejectionReason(reason);
        claim.setStatus(ClaimStatus.REJECTED);

        Claim saved = claimRepository.save(claim);
        notificationService.notifyClaimRejected(saved);
        return mapToResponse(saved);
    }

    private Claim getClaimById(Long claimId) {
        return claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Claim was not found for id " + claimId));
    }

    private ClaimStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return ClaimStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported claim status filter: " + status);
        }
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

        String sortValue = sort == null || sort.isBlank() ? DEFAULT_SORT : sort.trim();
        String[] parts = sortValue.split(",", -1);
        if (parts.length != 2) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        String sortField = toSortField(parts[0].trim());
        String sortDirectionValue = parts[1].trim().toLowerCase(Locale.ROOT);
        if (sortField.isBlank() || sortDirectionValue.isBlank()) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        Sort.Direction direction;
        if ("asc".equals(sortDirectionValue)) {
            direction = Sort.Direction.ASC;
        } else if ("desc".equals(sortDirectionValue)) {
            direction = Sort.Direction.DESC;
        } else {
            throw new BadRequestException("Invalid sort direction. Supported values are asc or desc");
        }

        Sort primarySort = Sort.by(direction, sortField);
        if (!"createdAt".equals(sortField)) {
            primarySort = primarySort.and(Sort.by(Sort.Direction.DESC, "createdAt"));
        }

        return PageRequest.of(pageNumber, pageSize, primarySort);
    }

    private String toSortField(String sortField) {
        return switch (sortField) {
            case "createdAt" -> "createdAt";
            case "status" -> "status";
            case "requestedAmount" -> "requestedAmount";
            case "approvedAmount" -> "approvedAmount";
            case "patientResponsibility" -> "patientResponsibility";
            case "claimId" -> "id";
            default -> throw new BadRequestException("Unsupported sort field: " + sortField);
        };
    }

    private ClaimResponse mapToResponse(Claim claim) {
        return new ClaimResponse(
                claim.getId(),
                claim.getAppointment() != null ? claim.getAppointment().getId() : null,
                claim.getInsurancePolicy() != null ? claim.getInsurancePolicy().getId() : null,
                claim.getInsurancePolicy() != null ? claim.getInsurancePolicy().getPolicyNumber() : null,
                claim.getAppointment() != null && claim.getAppointment().getPatient() != null
                        ? claim.getAppointment().getPatient().getId()
                        : null,
                claim.getAppointment() != null && claim.getAppointment().getPatient() != null
                        ? claim.getAppointment().getPatient().getFullName()
                        : null,
                claim.getAppointment() != null && claim.getAppointment().getDoctor() != null
                        ? claim.getAppointment().getDoctor().getId()
                        : null,
                claim.getAppointment() != null && claim.getAppointment().getDoctor() != null
                        ? claim.getAppointment().getDoctor().getFullName()
                        : null,
                claim.getRequestedAmount(),
                claim.getApprovedAmount(),
                claim.getPatientResponsibility(),
                claim.getRejectionReason(),
                claim.getStatus(),
                claim.getCreatedAt(),
                claim.getUpdatedAt());
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
