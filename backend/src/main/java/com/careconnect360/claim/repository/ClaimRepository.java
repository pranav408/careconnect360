package com.careconnect360.claim.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;

public interface ClaimRepository
    extends JpaRepository<Claim, Long>, JpaSpecificationExecutor<Claim> {

    Optional<Claim> findByAppointmentId(Long appointmentId);

    boolean existsByAppointmentId(Long appointmentId);

    List<Claim>
        findByAppointmentPatientIdOrderByCreatedAtDesc(
            Long patientId);

    List<Claim>
        findByAppointmentDoctorIdOrderByCreatedAtDesc(
            Long doctorId);

        Page<Claim> findByAppointmentPatientId(
            Long patientId,
            Pageable pageable);

        Page<Claim> findByAppointmentPatientIdAndStatus(
            Long patientId,
            ClaimStatus status,
            Pageable pageable);

        Optional<Claim> findByIdAndAppointmentPatientId(
            Long claimId,
            Long patientId);

    List<Claim> findByStatusOrderByCreatedAtAsc(
            ClaimStatus status);

    long countByStatus(ClaimStatus status);

        long countByAppointmentPatientIdAndStatus(
            Long patientId,
            ClaimStatus status);

        @Query(
        """
        SELECT COALESCE(SUM(c.patientResponsibility), 0)
        FROM Claim c
        WHERE c.appointment.patient.id = :patientId
          AND c.status = com.careconnect360.claim.enums.ClaimStatus.APPROVED
          AND NOT EXISTS (
            SELECT 1
            FROM Payment p
            WHERE p.claim = c
              AND p.status = com.careconnect360.payment.enums.PaymentStatus.SUCCESS
          )
        """
        )
        BigDecimal sumOutstandingPatientResponsibility(
            @Param("patientId") Long patientId);
}