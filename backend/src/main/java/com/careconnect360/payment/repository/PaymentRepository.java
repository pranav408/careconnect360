package com.careconnect360.payment.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;

public interface PaymentRepository
        extends JpaRepository<Payment, Long> {

    Optional<Payment> findByClaimId(Long claimId);

    boolean existsByClaimId(Long claimId);

    Optional<Payment> findByTransactionReferenceIgnoreCase(
            String transactionReference);

    boolean existsByTransactionReferenceIgnoreCase(
            String transactionReference);

    List<Payment> findByStatusOrderByCreatedAtAsc(
            PaymentStatus status);

    List<Payment>
        findByClaimAppointmentPatientIdOrderByCreatedAtDesc(
            Long patientId);

    Page<Payment> findByClaimAppointmentPatientId(
            Long patientId,
            Pageable pageable);

    Page<Payment> findByClaimAppointmentPatientIdAndStatus(
            Long patientId,
            PaymentStatus status,
            Pageable pageable);

    Page<Payment> findByClaimAppointmentPatientIdAndStatusIn(
            Long patientId,
            Collection<PaymentStatus> statuses,
            Pageable pageable);

    Page<Payment> findByStatus(
            PaymentStatus status,
            Pageable pageable);

    long countByStatus(PaymentStatus status);

    @Query(
        """
        SELECT COALESCE(SUM(p.amount), 0)
        FROM Payment p
        WHERE p.status = :status
        """
    )
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);
}