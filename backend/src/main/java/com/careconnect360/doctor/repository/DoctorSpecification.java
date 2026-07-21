package com.careconnect360.doctor.repository;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.domain.Specification;

import com.careconnect360.doctor.entity.Doctor;

import jakarta.persistence.criteria.Predicate;

public final class DoctorSpecification {

    private DoctorSpecification() {
    }

    public static Specification<Doctor> build(
            String name,
            String specialization,
            Boolean available) {

        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (name != null && !name.isBlank()) {
                predicates.add(builder.like(
                        builder.lower(root.get("fullName")),
                        "%" + name.trim().toLowerCase() + "%"));
            }

            if (specialization != null && !specialization.isBlank()) {
                predicates.add(builder.like(
                        builder.lower(root.get("specialization")),
                        "%" + specialization.trim().toLowerCase() + "%"));
            }

            if (Boolean.TRUE.equals(available)) {
                predicates.add(builder.isTrue(root.get("availableForAppointments")));
            } else if (Boolean.FALSE.equals(available)) {
                predicates.add(builder.isFalse(root.get("availableForAppointments")));
            }

            return builder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
