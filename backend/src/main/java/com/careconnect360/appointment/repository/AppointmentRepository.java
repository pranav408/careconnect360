package com.careconnect360.appointment.repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.appointment.enums.AppointmentStatus;

public interface AppointmentRepository
        extends JpaRepository<Appointment, Long> {

    List<Appointment>
        findByPatientIdOrderByAppointmentDateDescAppointmentTimeDesc(
            Long patientId);

    List<Appointment>
        findByDoctorIdOrderByAppointmentDateAscAppointmentTimeAsc(
            Long doctorId);

    List<Appointment>
        findByDoctorIdAndStatusInOrderByAppointmentDateAscAppointmentTimeAsc(
            Long doctorId,
            Collection<AppointmentStatus> statuses);

        Page<Appointment> findByPatientId(Long patientId, Pageable pageable);

        Page<Appointment> findByPatientIdAndStatus(
            Long patientId,
            AppointmentStatus status,
            Pageable pageable);

        Page<Appointment> findByDoctorId(Long doctorId, Pageable pageable);

        Page<Appointment> findByDoctorIdAndStatus(
            Long doctorId,
            AppointmentStatus status,
            Pageable pageable);

    boolean
        existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long doctorId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            Collection<AppointmentStatus> statuses);

    boolean existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusIn(
            Long patientId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            Collection<AppointmentStatus> statuses);

    long countByStatus(AppointmentStatus status);

        long countByPatientIdAndStatus(
            Long patientId,
            AppointmentStatus status);

        @Query(
        """
        SELECT a
        FROM Appointment a
        WHERE a.patient.id = :patientId
          AND a.status IN :statuses
          AND (
            a.appointmentDate > :currentDate
            OR (
                a.appointmentDate = :currentDate
                AND a.appointmentTime > :currentTime
            )
          )
        ORDER BY a.appointmentDate ASC, a.appointmentTime ASC
        """
        )
        Page<Appointment> findUpcomingAppointmentsForPatient(
            @Param("patientId") Long patientId,
            @Param("statuses") Collection<AppointmentStatus> statuses,
            @Param("currentDate") LocalDate currentDate,
            @Param("currentTime") LocalTime currentTime,
            Pageable pageable);
}