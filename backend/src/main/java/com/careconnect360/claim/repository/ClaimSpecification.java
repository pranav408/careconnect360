package com.careconnect360.claim.repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.data.jpa.domain.Specification;

import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;

public final class ClaimSpecification {

    private ClaimSpecification() {
    }

    public static Specification<Claim> build(
            ClaimStatus status,
            String patientEmail,
            String policyNumber,
            Long appointmentId) {

        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            }

            if (appointmentId != null) {
                predicates.add(builder.equal(root.get("appointment").get("id"), appointmentId));
            }

            if (patientEmail != null && !patientEmail.isBlank()) {
                String normalizedEmail = patientEmail.trim().toLowerCase(Locale.ROOT);
                Join<Object, Object> patientJoin = root.join("appointment", JoinType.INNER)
                        .join("patient", JoinType.INNER);
                Join<Object, Object> userJoin = patientJoin.join("user", JoinType.INNER);
                predicates.add(builder.equal(builder.lower(userJoin.get("email")), normalizedEmail));
            }

            if (policyNumber != null && !policyNumber.isBlank()) {
                String normalizedPolicyNumber = policyNumber.trim().toLowerCase(Locale.ROOT);
                predicates.add(builder.like(
                        builder.lower(root.get("insurancePolicy").get("policyNumber")),
                        "%" + normalizedPolicyNumber + "%"));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
