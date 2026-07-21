package com.careconnect360.insurance.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.DuplicateResourceException;
import com.careconnect360.common.exception.InvalidStatusTransitionException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.insurance.dto.CreateInsurancePolicyRequest;
import com.careconnect360.insurance.dto.InsurancePolicyResponse;
import com.careconnect360.insurance.dto.RejectInsurancePolicyRequest;
import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.patient.entity.Patient;

@Service
public class InsurancePolicyService {

    private static final String DEFAULT_SORT = "createdAt,desc";

    private final InsurancePolicyRepository insurancePolicyRepository;

    public InsurancePolicyService(InsurancePolicyRepository insurancePolicyRepository) {
        this.insurancePolicyRepository = insurancePolicyRepository;
    }

    @Transactional
    public InsurancePolicyResponse submitPolicy(
            Patient patient,
            CreateInsurancePolicyRequest request) {

        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        String normalizedPolicyNumber = normalizePolicyNumber(request.getPolicyNumber());
        if (insurancePolicyRepository.existsByPolicyNumberIgnoreCase(normalizedPolicyNumber)) {
            throw new DuplicateResourceException("A policy already exists with this policy number");
        }

        validateRequest(request);

        InsurancePolicy policy = new InsurancePolicy(
                patient,
                blankToNull(request.getProviderName()),
                normalizedPolicyNumber,
                request.getCoveragePercentage(),
                request.getDeductibleAmount(),
                request.getStartDate(),
                request.getEndDate());

        policy.setStatus(PolicyStatus.PENDING);
        InsurancePolicy saved = insurancePolicyRepository.save(policy);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<InsurancePolicyResponse> listPoliciesForPatient(Patient patient) {
        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        return insurancePolicyRepository.findByPatientIdOrderByCreatedAtDesc(patient.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public InsurancePolicyResponse getActivePolicyForPatient(Patient patient) {
        if (patient == null) {
            throw new BadRequestException("Patient profile is required");
        }

        InsurancePolicy policy = insurancePolicyRepository.findFirstByPatientIdAndStatusOrderByCreatedAtDesc(
                patient.getId(),
                PolicyStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("No active insurance policy was found for the authenticated patient"));

        return mapToResponse(policy);
    }

    @Transactional(readOnly = true)
    public Page<InsurancePolicyResponse> listPoliciesForAdmin(
            String status,
            String patientEmail,
            String policyNumber,
            Integer page,
            Integer size,
            String sort) {

        SortSpec sortSpec = parseSort(sort);

        int pageNumber = page == null ? 0 : page;
        int pageSize = size == null ? 10 : size;
        if (pageNumber < 0) {
            throw new BadRequestException("Page index must be greater than or equal to 0");
        }
        if (pageSize < 1) {
            throw new BadRequestException("Page size must be greater than 0");
        }

        List<InsurancePolicy> policies = new ArrayList<>(insurancePolicyRepository.findAll());
        policies = filterPolicies(policies, status, patientEmail, policyNumber);
        policies.sort(sortSpec.comparator());

        int total = policies.size();
        int fromIndex = Math.min(pageNumber * pageSize, total);
        int toIndex = Math.min(fromIndex + pageSize, total);
        List<InsurancePolicy> pageContent = policies.subList(fromIndex, toIndex);
        Page<InsurancePolicyResponse> pageResponse = new PageImpl<>(
                pageContent.stream().map(this::mapToResponse).toList(),
            PageRequest.of(pageNumber, pageSize, Sort.by(sortSpec.direction(), sortSpec.field())),
                total);
        return pageResponse;
    }

    @Transactional
    public InsurancePolicyResponse activatePolicy(Long policyId) {
        InsurancePolicy policy = insurancePolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("Insurance policy was not found for id " + policyId));

        if (policy.getStatus() != PolicyStatus.PENDING) {
            throw new InvalidStatusTransitionException("Only pending policies may be activated");
        }

        boolean hasActivePolicy = insurancePolicyRepository.findFirstByPatientIdAndStatusOrderByCreatedAtDesc(
                policy.getPatient().getId(),
                PolicyStatus.ACTIVE)
                .isPresent();
        if (hasActivePolicy) {
            throw new InvalidStatusTransitionException("The patient already has an active insurance policy");
        }

        policy.setStatus(PolicyStatus.ACTIVE);
        return mapToResponse(insurancePolicyRepository.save(policy));
    }

    @Transactional
    public InsurancePolicyResponse rejectPolicy(Long policyId, RejectInsurancePolicyRequest request) {
        InsurancePolicy policy = insurancePolicyRepository.findById(policyId)
                .orElseThrow(() -> new ResourceNotFoundException("Insurance policy was not found for id " + policyId));

        if (policy.getStatus() != PolicyStatus.PENDING) {
            throw new InvalidStatusTransitionException("Only pending policies may be rejected");
        }

        if (request == null || request.getReason() == null || request.getReason().isBlank()) {
            throw new BadRequestException("Rejection reason is required");
        }

        // The existing InsurancePolicy entity has no rejectionReason field,
        // so the reason is validated at request time but not persisted.
        policy.setStatus(PolicyStatus.REJECTED);
        return mapToResponse(insurancePolicyRepository.save(policy));
    }

    private SortSpec parseSort(String sort) {
        String sortValue = sort == null || sort.isBlank() ? DEFAULT_SORT : sort.trim();
        String[] parts = sortValue.split(",", -1);
        if (parts.length != 2) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        String field = parts[0].trim();
        String directionValue = parts[1].trim().toLowerCase(Locale.ROOT);
        if (field.isBlank() || directionValue.isBlank()) {
            throw new BadRequestException("Invalid sort format. Expected field,direction");
        }

        Sort.Direction direction;
        if ("asc".equals(directionValue)) {
            direction = Sort.Direction.ASC;
        } else if ("desc".equals(directionValue)) {
            direction = Sort.Direction.DESC;
        } else {
            throw new BadRequestException("Invalid sort direction. Supported values are asc or desc");
        }

        Comparator<InsurancePolicy> comparator = comparatorForField(field);
        if (direction == Sort.Direction.DESC) {
            comparator = comparator.reversed();
        }

        return new SortSpec(field, direction, comparator);
    }

    private Comparator<InsurancePolicy> comparatorForField(String field) {
        return switch (field) {
            case "createdAt" -> Comparator.comparing(InsurancePolicy::getCreatedAt);
            case "policyNumber" -> Comparator.comparing(InsurancePolicy::getPolicyNumber, String.CASE_INSENSITIVE_ORDER);
            case "providerName" -> Comparator.comparing(InsurancePolicy::getProviderName, String.CASE_INSENSITIVE_ORDER);
            case "startDate" -> Comparator.comparing(InsurancePolicy::getStartDate);
            case "endDate" -> Comparator.comparing(InsurancePolicy::getEndDate);
            case "status" -> Comparator.comparing(InsurancePolicy::getStatus);
            case "coveragePercentage" -> Comparator.comparing(InsurancePolicy::getCoveragePercentage);
            case "deductibleAmount" -> Comparator.comparing(InsurancePolicy::getDeductibleAmount);
            default -> throw new BadRequestException("Unsupported sort field: " + field);
        };
    }

    private void validateRequest(CreateInsurancePolicyRequest request) {
        if (request == null) {
            throw new BadRequestException("Insurance policy request is required");
        }

        String providerName = blankToNull(request.getProviderName());
        if (providerName == null) {
            throw new BadRequestException("Provider name is required");
        }
        if (request.getCoveragePercentage() == null) {
            throw new BadRequestException("Coverage percentage is required");
        }
        if (request.getDeductibleAmount() == null) {
            throw new BadRequestException("Deductible amount is required");
        }
        if (request.getStartDate() == null) {
            throw new BadRequestException("Start date is required");
        }
        if (request.getEndDate() == null) {
            throw new BadRequestException("End date is required");
        }
        if (request.getCoveragePercentage().compareTo(BigDecimal.ZERO) < 0 || request.getCoveragePercentage().compareTo(new BigDecimal("100")) > 0) {
            throw new BadRequestException("Coverage percentage must be between 0 and 100");
        }
        if (request.getDeductibleAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Deductible amount cannot be negative");
        }
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }
    }

    private String normalizePolicyNumber(String policyNumber) {
        if (policyNumber == null || policyNumber.isBlank()) {
            throw new BadRequestException("Policy number is required");
        }
        String normalized = policyNumber.trim();
        if (normalized.length() > 80) {
            throw new BadRequestException("Policy number cannot exceed 80 characters");
        }
        return normalized;
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private InsurancePolicyResponse mapToResponse(InsurancePolicy policy) {
        return new InsurancePolicyResponse(
                policy.getId(),
                policy.getPolicyNumber(),
                policy.getProviderName(),
                policy.getCoveragePercentage(),
                policy.getDeductibleAmount(),
                policy.getStartDate(),
                policy.getEndDate(),
                policy.getStatus());
    }

    private List<InsurancePolicy> filterPolicies(
            List<InsurancePolicy> policies,
            String status,
            String patientEmail,
            String policyNumber) {

        String normalizedStatus = status == null ? null : status.trim().toUpperCase(Locale.ROOT);
        String normalizedEmail = patientEmail == null ? null : patientEmail.trim().toLowerCase(Locale.ROOT);
        String normalizedPolicyNumber = policyNumber == null ? null : policyNumber.trim();

        return new ArrayList<>(policies.stream()
                .filter(policy -> normalizedStatus == null || policy.getStatus().name().equals(normalizedStatus))
                .filter(policy -> normalizedEmail == null || (policy.getPatient() != null && policy.getPatient().getUser() != null && normalizedEmail.equals(policy.getPatient().getUser().getEmail())))
                .filter(policy -> normalizedPolicyNumber == null || (policy.getPolicyNumber() != null && policy.getPolicyNumber().contains(normalizedPolicyNumber)))
                .toList());
    }

    private record SortSpec(String field, Sort.Direction direction, Comparator<InsurancePolicy> comparator) {
    }
}
