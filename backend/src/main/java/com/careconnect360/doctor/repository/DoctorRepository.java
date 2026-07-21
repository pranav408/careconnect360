package com.careconnect360.doctor.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.careconnect360.doctor.entity.Doctor;

public interface DoctorRepository extends JpaRepository<Doctor, Long>, JpaSpecificationExecutor<Doctor> {

    Optional<Doctor> findByUserId(Long userId);

    List<Doctor> findBySpecializationContainingIgnoreCase(
            String specialization);

    List<Doctor> findByAvailableForAppointmentsTrue();

    List<Doctor>
        findBySpecializationContainingIgnoreCaseAndAvailableForAppointmentsTrue(
            String specialization);

    Page<Doctor> findAll(Pageable pageable);

    boolean existsByUserId(Long userId);

    boolean existsByLicenseNumberIgnoreCase(String licenseNumber);

    long countByAvailableForAppointmentsTrue();
}