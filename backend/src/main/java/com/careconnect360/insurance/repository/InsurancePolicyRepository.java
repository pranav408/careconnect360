package com.careconnect360.insurance.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;

public interface InsurancePolicyRepository
        extends JpaRepository<InsurancePolicy, Long> {

    Optional<InsurancePolicy> findByPolicyNumberIgnoreCase(
            String policyNumber);

    boolean existsByPolicyNumberIgnoreCase(String policyNumber);

    List<InsurancePolicy> findByPatientIdOrderByCreatedAtDesc(
            Long patientId);

    List<InsurancePolicy> findByStatusOrderByCreatedAtAsc(
            PolicyStatus status);

    Optional<InsurancePolicy>
        findFirstByPatientIdAndStatusOrderByCreatedAtDesc(
            Long patientId,
            PolicyStatus status);

        Optional<InsurancePolicy>
                findFirstByPatientIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
                        Long patientId,
                        PolicyStatus status,
                        LocalDate startDate,
                        LocalDate endDate);

        long countByStatus(PolicyStatus status);
}