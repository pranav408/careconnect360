package com.careconnect360.payment.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.common.exception.BadRequestException;
import com.careconnect360.common.exception.DuplicateResourceException;
import com.careconnect360.common.exception.ForbiddenOperationException;
import com.careconnect360.common.exception.InvalidStatusTransitionException;
import com.careconnect360.common.exception.ResourceNotFoundException;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.notification.service.NotificationService;
import com.careconnect360.payment.dto.MockPaymentRequest;
import com.careconnect360.payment.dto.PaymentResponse;
import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;
import com.careconnect360.payment.repository.PaymentRepository;

@Service
public class PaymentService {

    private static final String DEFAULT_SORT = "createdAt,desc";
    private static final int TRANSACTION_REFERENCE_MAX_LENGTH = 100;
    private static final String TRANSACTION_REFERENCE_PREFIX = "CC360-PAY-";

    private final PaymentRepository paymentRepository;
    private final ClaimRepository claimRepository;
    private final NotificationService notificationService;

    public PaymentService(
            PaymentRepository paymentRepository,
            ClaimRepository claimRepository,
            NotificationService notificationService) {

        this.paymentRepository = paymentRepository;
        this.claimRepository = claimRepository;
        this.notificationService = notificationService;
    }

    @Transactional
    public PaymentResponse processMockPayment(
            Patient patient,
            Long claimId,
            MockPaymentRequest request) {

        if (patient == null || patient.getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }
        if (request == null || request.getOutcome() == null) {
            throw new BadRequestException("Payment outcome is required");
        }

        Claim claim = claimRepository.findById(claimId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Claim was not found for id " + claimId));

        if (!claim.getAppointment().getPatient().getId().equals(patient.getId())) {
            throw new ForbiddenOperationException("You are not allowed to pay this claim");
        }

        if (paymentRepository.existsByClaimId(claim.getId())) {
            throw new DuplicateResourceException("A payment already exists for this claim");
        }

        if (claim.getStatus() != ClaimStatus.APPROVED) {
            throw new InvalidStatusTransitionException("Only approved claims may be paid");
        }

        BigDecimal amount = normalizeAmount(claim.getPatientResponsibility());
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Patient responsibility cannot be negative");
        }
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            throw new BadRequestException("No payment is required for this claim");
        }

        String transactionReference = generateUniqueTransactionReference();
        Payment payment = new Payment(claim, amount, transactionReference);
        Payment persistedPayment = paymentRepository.save(payment);

        if (request.getOutcome() == MockPaymentRequest.Outcome.SUCCESS) {
            persistedPayment.setStatus(PaymentStatus.SUCCESS);
            persistedPayment.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
            persistedPayment.setFailureReason(null);

            claim.setStatus(ClaimStatus.PAID);
            claimRepository.save(claim);

            notificationService.notifyPaymentSuccess(persistedPayment);
            notificationService.notifyClaimPaid(claim);
        } else {
            String reason = normalizeFailureReason(request.getFailureReason());
            persistedPayment.setStatus(PaymentStatus.FAILED);
            persistedPayment.setPaidAt(null);
            persistedPayment.setFailureReason(reason);

            notificationService.notifyPaymentFailure(persistedPayment);
        }

        Payment saved = paymentRepository.save(persistedPayment);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> listPaymentsForPatient(
            Patient patient,
            String status,
            Integer page,
            Integer size,
            String sort) {

        if (patient == null || patient.getId() == null) {
            throw new BadRequestException("Patient profile is required");
        }

        PaymentStatus paymentStatus = parseOptionalStatus(status);
        Pageable pageable = buildPageable(page, size, sort);

        Page<Payment> payments = paymentStatus == null
                ? paymentRepository.findByClaimAppointmentPatientId(patient.getId(), pageable)
                : paymentRepository.findByClaimAppointmentPatientIdAndStatus(patient.getId(), paymentStatus, pageable);

        return payments.map(this::mapToResponse);
    }

    private BigDecimal normalizeAmount(BigDecimal amount) {
        if (amount == null) {
            throw new BadRequestException("Claim patient responsibility is required");
        }
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private String normalizeFailureReason(String failureReason) {
        if (failureReason == null || failureReason.isBlank()) {
            throw new BadRequestException("Failure reason is required when outcome is FAILURE");
        }

        String normalized = failureReason.trim();
        if (normalized.length() > 500) {
            throw new BadRequestException("Failure reason cannot exceed 500 characters");
        }

        return normalized;
    }

    private String generateUniqueTransactionReference() {
        for (int attempt = 0; attempt < 10; attempt++) {
            String reference = TRANSACTION_REFERENCE_PREFIX + UUID.randomUUID();
            if (reference.length() > TRANSACTION_REFERENCE_MAX_LENGTH) {
                throw new BadRequestException("Generated transaction reference exceeds allowed length");
            }

            if (!paymentRepository.existsByTransactionReferenceIgnoreCase(reference)) {
                return reference;
            }
        }

        throw new DuplicateResourceException("Unable to generate a unique transaction reference");
    }

    private PaymentStatus parseOptionalStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return PaymentStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Unsupported payment status filter: " + status);
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
            case "amount" -> "amount";
            case "status" -> "status";
            case "paidAt" -> "paidAt";
            case "transactionReference" -> "transactionReference";
            case "paymentId" -> "id";
            default -> throw new BadRequestException("Unsupported sort field: " + sortField);
        };
    }

    private PaymentResponse mapToResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getClaim() != null ? payment.getClaim().getId() : null,
                payment.getClaim() != null && payment.getClaim().getAppointment() != null
                        ? payment.getClaim().getAppointment().getId()
                        : null,
                payment.getTransactionReference(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getPaidAt(),
                payment.getFailureReason(),
                payment.getCreatedAt(),
                payment.getUpdatedAt());
    }
}
