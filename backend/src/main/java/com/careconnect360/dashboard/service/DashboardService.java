package com.careconnect360.dashboard.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.claim.entity.Claim;
import com.careconnect360.claim.enums.ClaimStatus;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.dashboard.dto.AdminDashboardResponse;
import com.careconnect360.dashboard.dto.DashboardAppointmentSummary;
import com.careconnect360.dashboard.dto.DashboardClaimSummary;
import com.careconnect360.dashboard.dto.DashboardPatientProfileSummary;
import com.careconnect360.dashboard.dto.DashboardPaymentSummary;
import com.careconnect360.dashboard.dto.DashboardPolicySummary;
import com.careconnect360.dashboard.dto.PatientDashboardResponse;
import com.careconnect360.dashboard.dto.StatusCountResponse;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.entity.Payment;
import com.careconnect360.payment.enums.PaymentStatus;
import com.careconnect360.payment.repository.PaymentRepository;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int UPCOMING_APPOINTMENT_LIMIT = 5;
    private static final int RECENT_ITEM_LIMIT = 5;
    private static final String UNSUPPORTED_METRIC = "UNSUPPORTED";

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final InsurancePolicyRepository insurancePolicyRepository;
    private final ClaimRepository claimRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationRepository notificationRepository;
    private final Clock clock;

    public DashboardService(
            PatientRepository patientRepository,
            DoctorRepository doctorRepository,
            AppointmentRepository appointmentRepository,
            InsurancePolicyRepository insurancePolicyRepository,
            ClaimRepository claimRepository,
            PaymentRepository paymentRepository,
            NotificationRepository notificationRepository,
            Clock clock) {

        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.appointmentRepository = appointmentRepository;
        this.insurancePolicyRepository = insurancePolicyRepository;
        this.claimRepository = claimRepository;
        this.paymentRepository = paymentRepository;
        this.notificationRepository = notificationRepository;
        this.clock = clock;
    }

    public PatientDashboardResponse getPatientDashboard(Patient patient) {
        DashboardPatientProfileSummary profile = mapPatientProfile(patient);
        DashboardPolicySummary activePolicy = insurancePolicyRepository
                .findFirstByPatientIdAndStatusOrderByCreatedAtDesc(patient.getId(), PolicyStatus.ACTIVE)
                .map(this::mapPolicySummary)
                .orElse(null);

        LocalDate currentDate = LocalDate.now(clock);
        LocalTime currentTime = LocalTime.now(clock);
        Pageable upcomingPageable = PageRequest.of(0, UPCOMING_APPOINTMENT_LIMIT);
        List<DashboardAppointmentSummary> upcomingAppointments = appointmentRepository
                .findUpcomingAppointmentsForPatient(
                        patient.getId(),
                        List.of(AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED),
                        currentDate,
                        currentTime,
                        upcomingPageable)
                .stream()
                .map(this::mapAppointmentSummary)
                .toList();

        List<StatusCountResponse> appointmentCounts = Arrays.stream(AppointmentStatus.values())
                .map(status -> new StatusCountResponse(
                        status.name(),
                        appointmentRepository.countByPatientIdAndStatus(patient.getId(), status)))
                .toList();

        List<StatusCountResponse> claimCounts = Arrays.stream(ClaimStatus.values())
                .map(status -> new StatusCountResponse(
                        status.name(),
                        claimRepository.countByAppointmentPatientIdAndStatus(patient.getId(), status)))
                .toList();

        BigDecimal outstandingPatientResponsibility = scaleMoney(
                claimRepository.sumOutstandingPatientResponsibility(patient.getId()));

        Pageable recentPageable = recentPageable();
        List<DashboardClaimSummary> recentClaims = claimRepository
                .findByAppointmentPatientId(patient.getId(), recentPageable)
                .stream()
                .map(this::mapClaimSummary)
                .toList();

        List<DashboardPaymentSummary> recentPayments = paymentRepository
                .findByClaimAppointmentPatientIdAndStatusIn(
                        patient.getId(),
                        List.of(PaymentStatus.SUCCESS, PaymentStatus.FAILED),
                        recentPageable)
                .stream()
                .map(this::mapPaymentSummary)
                .toList();

        long unreadNotificationCount = notificationRepository.countByRecipientIdAndReadStatusFalse(
                patient.getUser().getId());

        return new PatientDashboardResponse(
                profile,
                activePolicy,
                upcomingAppointments,
                appointmentCounts,
                claimCounts,
                outstandingPatientResponsibility,
                recentClaims,
                recentPayments,
                unreadNotificationCount);
    }

    public AdminDashboardResponse getAdminDashboard() {
        long totalPatientCount = patientRepository.count();
        long totalDoctorCount = doctorRepository.count();
        long availableDoctorCount = doctorRepository.countByAvailableForAppointmentsTrue();
        long totalAppointmentCount = appointmentRepository.count();

        List<StatusCountResponse> appointmentCounts = Arrays.stream(AppointmentStatus.values())
                .map(status -> new StatusCountResponse(status.name(), appointmentRepository.countByStatus(status)))
                .toList();

        List<StatusCountResponse> policyCounts = Arrays.stream(PolicyStatus.values())
                .map(status -> new StatusCountResponse(status.name(), insurancePolicyRepository.countByStatus(status)))
                .toList();

        List<StatusCountResponse> claimCounts = Arrays.stream(ClaimStatus.values())
                .map(status -> new StatusCountResponse(status.name(), claimRepository.countByStatus(status)))
                .toList();

        long successfulPaymentCount = paymentRepository.countByStatus(PaymentStatus.SUCCESS);
        long failedPaymentCount = paymentRepository.countByStatus(PaymentStatus.FAILED);
        BigDecimal totalSuccessfulPaymentAmount = scaleMoney(
                paymentRepository.sumAmountByStatus(PaymentStatus.SUCCESS));
        long unreadNotificationCount = notificationRepository.countByReadStatusFalse();

        Pageable recentPageable = recentPageable();
        List<DashboardAppointmentSummary> recentAppointments = appointmentRepository
                .findAll(recentPageable)
                .stream()
                .map(this::mapAppointmentSummary)
                .toList();

        List<DashboardClaimSummary> recentClaims = claimRepository
                .findAll(recentPageable)
                .stream()
                .map(this::mapClaimSummary)
                .toList();

        List<DashboardPaymentSummary> recentSuccessfulPayments = paymentRepository
                .findByStatus(PaymentStatus.SUCCESS, recentPageable)
                .stream()
                .map(this::mapPaymentSummary)
                .toList();

        return new AdminDashboardResponse(
                totalPatientCount,
                totalDoctorCount,
                availableDoctorCount,
                totalAppointmentCount,
                appointmentCounts,
                policyCounts,
                claimCounts,
                successfulPaymentCount,
                failedPaymentCount,
                totalSuccessfulPaymentAmount,
                unreadNotificationCount,
                recentAppointments,
                recentClaims,
                recentSuccessfulPayments,
                UNSUPPORTED_METRIC);
    }

    private Pageable recentPageable() {
        return PageRequest.of(0, RECENT_ITEM_LIMIT, Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    private DashboardPatientProfileSummary mapPatientProfile(Patient patient) {
        return new DashboardPatientProfileSummary(
                patient.getId(),
                patient.getUser() != null ? patient.getUser().getEmail() : null,
                patient.getFullName(),
                patient.getPhone(),
                patient.getAddress(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getUser() != null && patient.getUser().getStatus() != null
                        ? patient.getUser().getStatus().name()
                        : null);
    }

    private DashboardPolicySummary mapPolicySummary(InsurancePolicy policy) {
        return new DashboardPolicySummary(
                policy.getId(),
                policy.getPolicyNumber(),
                policy.getProviderName(),
                scaleMoney(policy.getCoveragePercentage()),
                scaleMoney(policy.getDeductibleAmount()),
                policy.getStartDate(),
                policy.getEndDate(),
                policy.getStatus());
    }

    private DashboardAppointmentSummary mapAppointmentSummary(Appointment appointment) {
        return new DashboardAppointmentSummary(
                appointment.getId(),
                appointment.getAppointmentDate(),
                appointment.getAppointmentTime(),
                appointment.getReason(),
                appointment.getStatus(),
                appointment.getDoctor() != null ? appointment.getDoctor().getId() : null,
                appointment.getDoctor() != null ? appointment.getDoctor().getFullName() : null,
                appointment.getDoctor() != null ? appointment.getDoctor().getSpecialization() : null,
                appointment.getPatient() != null ? appointment.getPatient().getId() : null,
                appointment.getPatient() != null ? appointment.getPatient().getFullName() : null,
                appointment.getCreatedAt());
    }

    private DashboardClaimSummary mapClaimSummary(Claim claim) {
        return new DashboardClaimSummary(
                claim.getId(),
                claim.getAppointment() != null ? claim.getAppointment().getId() : null,
                claim.getInsurancePolicy() != null ? claim.getInsurancePolicy().getId() : null,
                claim.getInsurancePolicy() != null ? claim.getInsurancePolicy().getPolicyNumber() : null,
                scaleMoney(claim.getRequestedAmount()),
                scaleMoney(claim.getApprovedAmount()),
                scaleMoney(claim.getPatientResponsibility()),
                claim.getStatus(),
                claim.getAppointment() != null && claim.getAppointment().getDoctor() != null
                        ? claim.getAppointment().getDoctor().getFullName()
                        : null,
                claim.getAppointment() != null && claim.getAppointment().getPatient() != null
                        ? claim.getAppointment().getPatient().getFullName()
                        : null,
                claim.getCreatedAt());
    }

    private DashboardPaymentSummary mapPaymentSummary(Payment payment) {
        return new DashboardPaymentSummary(
                payment.getId(),
                payment.getClaim() != null ? payment.getClaim().getId() : null,
                payment.getClaim() != null && payment.getClaim().getAppointment() != null
                        ? payment.getClaim().getAppointment().getId()
                        : null,
                payment.getTransactionReference(),
                scaleMoney(payment.getAmount()),
                payment.getStatus(),
                payment.getFailureReason(),
                payment.getPaidAt(),
                payment.getClaim() != null && payment.getClaim().getAppointment() != null
                        && payment.getClaim().getAppointment().getPatient() != null
                                ? payment.getClaim().getAppointment().getPatient().getFullName()
                                : null,
                payment.getCreatedAt());
    }

    private BigDecimal scaleMoney(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}