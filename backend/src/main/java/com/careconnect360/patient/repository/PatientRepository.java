package com.careconnect360.patient.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.careconnect360.patient.entity.Patient;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByUserId(Long userId);

    Optional<Patient> findByUserEmailIgnoreCase(String email);

    boolean existsByUserId(Long userId);
}