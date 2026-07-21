package com.careconnect360.appointment.controller;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.careconnect360.appointment.entity.Appointment;
import com.careconnect360.appointment.enums.AppointmentStatus;
import com.careconnect360.appointment.repository.AppointmentRepository;
import com.careconnect360.auth.entity.User;
import com.careconnect360.auth.enums.AccountStatus;
import com.careconnect360.auth.enums.UserRole;
import com.careconnect360.auth.repository.UserRepository;
import com.careconnect360.auth.security.JwtService;
import com.careconnect360.claim.repository.ClaimRepository;
import com.careconnect360.doctor.entity.Doctor;
import com.careconnect360.doctor.repository.DoctorRepository;
import com.careconnect360.insurance.entity.InsurancePolicy;
import com.careconnect360.insurance.enums.PolicyStatus;
import com.careconnect360.insurance.repository.InsurancePolicyRepository;
import com.careconnect360.notification.repository.NotificationRepository;
import com.careconnect360.patient.entity.Patient;
import com.careconnect360.patient.repository.PatientRepository;
import com.careconnect360.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AppointmentWorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

        @Autowired
        private InsurancePolicyRepository insurancePolicyRepository;

        @Autowired
        private ClaimRepository claimRepository;

        @Autowired
        private PaymentRepository paymentRepository;

        @Autowired
        private NotificationRepository notificationRepository;

    @Autowired
    private JwtService jwtService;

    @BeforeEach
    void clearData() {
                notificationRepository.deleteAll();
                paymentRepository.deleteAll();
                claimRepository.deleteAll();
                insurancePolicyRepository.deleteAll();
        appointmentRepository.deleteAll();
        doctorRepository.deleteAll();
        patientRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void authenticatedPatientCanBookAvailableDoctor() throws Exception {
        User patientUser = saveUser("book-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Book Patient", "5551000001");
        Doctor doctor = saveDoctor("book-doctor@example.com", "Dr. Book", true);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().plusDays(1),
                        LocalTime.of(10, 30),
                        "Routine check-up"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.doctorId").value(doctor.getId()))
                .andExpect(jsonPath("$.patientId").value(patient.getId()))
                .andExpect(jsonPath("$.status").value("REQUESTED"));
    }

    @Test
    void createdAppointmentStatusIsForcedToRequested() throws Exception {
        User patientUser = saveUser("force-status-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Force Patient", "5551000002");
        Doctor doctor = saveDoctor("force-status-doctor@example.com", "Dr. Force", true);
        String token = jwtService.generateToken(patientUser);

        Map<String, Object> payload = buildCreatePayload(
                doctor.getId(),
                LocalDate.now().plusDays(1),
                LocalTime.of(9, 0),
                "Follow-up");
        payload.put("status", "CONFIRMED");

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("REQUESTED"));

        Appointment persisted = appointmentRepository.findAll().get(0);
        assertEquals(AppointmentStatus.REQUESTED, persisted.getStatus());
    }

    @Test
    void patientCannotAssignAnotherPatient() throws Exception {
        User firstPatientUser = saveUser("assign-patient-a@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "Patient A", "5551000003");
        User secondPatientUser = saveUser("assign-patient-b@example.com", UserRole.PATIENT);
        savePatient(secondPatientUser, "Patient B", "5551000004");
        Doctor doctor = saveDoctor("assign-doctor@example.com", "Dr. Assign", true);
        String token = jwtService.generateToken(firstPatientUser);

        Map<String, Object> payload = buildCreatePayload(
                doctor.getId(),
                LocalDate.now().plusDays(1),
                LocalTime.of(11, 0),
                "Consultation");
        payload.put("patientId", 9999L);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isCreated());

        Appointment persisted = appointmentRepository.findAll().get(0);
        assertEquals(firstPatient.getId(), persisted.getPatient().getId());
    }

    @Test
    void missingDoctorReturnsNotFound() throws Exception {
        User patientUser = saveUser("missing-doctor-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Missing Doctor Patient", "5551000005");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        999999L,
                        LocalDate.now().plusDays(1),
                        LocalTime.of(10, 0),
                        "Consultation"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void unavailableDoctorReturnsConflict() throws Exception {
        User patientUser = saveUser("unavailable-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Unavailable Patient", "5551000006");
        Doctor doctor = saveDoctor("unavailable-doctor@example.com", "Dr. Unavailable", false);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().plusDays(1),
                        LocalTime.of(10, 45),
                        "Consultation"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void pastAppointmentDateTimeReturnsBadRequest() throws Exception {
        User patientUser = saveUser("past-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Past Patient", "5551000007");
        Doctor doctor = saveDoctor("past-doctor@example.com", "Dr. Past", true);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().minusDays(1),
                        LocalTime.of(10, 0),
                        "Consultation"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void doctorSchedulingConflictReturnsConflict() throws Exception {
        User firstPatientUser = saveUser("doctor-conflict-patient-1@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "Patient One", "5551000008");
        User secondPatientUser = saveUser("doctor-conflict-patient-2@example.com", UserRole.PATIENT);
        savePatient(secondPatientUser, "Patient Two", "5551000009");
        Doctor doctor = saveDoctor("doctor-conflict-doctor@example.com", "Dr. Conflict", true);

        saveAppointment(
                firstPatient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(14, 0),
                "Existing",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(secondPatientUser);
        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().plusDays(2),
                        LocalTime.of(14, 0),
                        "Same slot"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void patientSameTimeConflictReturnsConflict() throws Exception {
        User patientUser = saveUser("patient-conflict-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Conflict Patient", "5551000010");
        Doctor doctorOne = saveDoctor("patient-conflict-doctor1@example.com", "Dr. One", true);
        Doctor doctorTwo = saveDoctor("patient-conflict-doctor2@example.com", "Dr. Two", true);

        saveAppointment(
                patient,
                doctorOne,
                LocalDate.now().plusDays(3),
                LocalTime.of(15, 30),
                "Existing",
                AppointmentStatus.CONFIRMED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctorTwo.getId(),
                        LocalDate.now().plusDays(3),
                        LocalTime.of(15, 30),
                        "Same time"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void patientRetrievesOnlyOwnAppointments() throws Exception {
        User firstPatientUser = saveUser("list-patient-1@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "List One", "5551000011");
        User secondPatientUser = saveUser("list-patient-2@example.com", UserRole.PATIENT);
        Patient secondPatient = savePatient(secondPatientUser, "List Two", "5551000012");
        Doctor doctor = saveDoctor("list-doctor@example.com", "Dr. List", true);

        saveAppointment(firstPatient, doctor, LocalDate.now().plusDays(1), LocalTime.of(9, 0), "A", AppointmentStatus.REQUESTED);
        saveAppointment(secondPatient, doctor, LocalDate.now().plusDays(1), LocalTime.of(10, 0), "B", AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(firstPatientUser);
        mockMvc.perform(get("/api/appointments/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].patientId").value(firstPatient.getId()));
    }

    @Test
    void patientCanCancelOwnRequestedAppointment() throws Exception {
        User patientUser = saveUser("cancel-requested-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Cancel Requested", "5551000013");
        Doctor doctor = saveDoctor("cancel-requested-doctor@example.com", "Dr. Cancel", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(12, 0),
                "Cancel requested",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(patch("/api/appointments/{appointmentId}/cancel", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void patientCanCancelOwnConfirmedAppointment() throws Exception {
        User patientUser = saveUser("cancel-confirmed-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Cancel Confirmed", "5551000014");
        Doctor doctor = saveDoctor("cancel-confirmed-doctor@example.com", "Dr. Cancel2", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(13, 0),
                "Cancel confirmed",
                AppointmentStatus.CONFIRMED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(patch("/api/appointments/{appointmentId}/cancel", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void patientCannotCancelCompletedAppointment() throws Exception {
        User patientUser = saveUser("cancel-completed-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Cancel Completed", "5551000015");
        Doctor doctor = saveDoctor("cancel-completed-doctor@example.com", "Dr. Done", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(14, 0),
                "Done",
                AppointmentStatus.COMPLETED);

        String token = jwtService.generateToken(patientUser);
        mockMvc.perform(patch("/api/appointments/{appointmentId}/cancel", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void anotherPatientCannotCancelAppointment() throws Exception {
        User ownerUser = saveUser("cancel-owner@example.com", UserRole.PATIENT);
        Patient owner = savePatient(ownerUser, "Owner", "5551000016");
        User anotherUser = saveUser("cancel-other@example.com", UserRole.PATIENT);
        savePatient(anotherUser, "Other", "5551000017");
        Doctor doctor = saveDoctor("cancel-other-doctor@example.com", "Dr. Guard", true);
        Appointment appointment = saveAppointment(
                owner,
                doctor,
                LocalDate.now().plusDays(1),
                LocalTime.of(15, 0),
                "Private",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(anotherUser);
        mockMvc.perform(patch("/api/appointments/{appointmentId}/cancel", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void missingAppointmentReturnsNotFound() throws Exception {
        User patientUser = saveUser("cancel-missing-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Missing", "5551000018");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(patch("/api/appointments/999999/cancel")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    void authenticatedDoctorRetrievesOnlyAssignedAppointments() throws Exception {
        User patientUser = saveUser("doctor-list-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Doctor List Patient", "5551000019");

        User doctorUserOne = saveUser("doctor-list-1@example.com", UserRole.DOCTOR);
        Doctor doctorOne = saveDoctor(doctorUserOne, "Dr. One", true);
        User doctorUserTwo = saveUser("doctor-list-2@example.com", UserRole.DOCTOR);
        Doctor doctorTwo = saveDoctor(doctorUserTwo, "Dr. Two", true);

        saveAppointment(patient, doctorOne, LocalDate.now().plusDays(2), LocalTime.of(9, 30), "One", AppointmentStatus.REQUESTED);
        saveAppointment(patient, doctorTwo, LocalDate.now().plusDays(2), LocalTime.of(10, 30), "Two", AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(doctorUserOne);
        mockMvc.perform(get("/api/doctor/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].doctorId").value(doctorOne.getId()));
    }

    @Test
    void assignedDoctorCanConfirmRequestedAppointment() throws Exception {
        User patientUser = saveUser("confirm-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Confirm Patient", "5551000020");
        User doctorUser = saveUser("confirm-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Confirm", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(11, 30),
                "Confirm",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/confirm", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));
    }

    @Test
    void assignedDoctorCanRejectRequestedAppointment() throws Exception {
        User patientUser = saveUser("reject-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Reject Patient", "5551000021");
        User doctorUser = saveUser("reject-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Reject", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(12, 30),
                "Reject",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/reject", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
    }

    @Test
    void assignedDoctorCanCompleteConfirmedAppointment() throws Exception {
        User patientUser = saveUser("complete-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Complete Patient", "5551000022");
        User doctorUser = saveUser("complete-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Complete", true);
        savePolicy(
                patient,
                "POL-COMPLETE-001",
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(30),
                PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(13, 30),
                "Complete",
                AppointmentStatus.CONFIRMED);

        String token = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        Appointment persisted = appointmentRepository.findById(appointment.getId()).orElseThrow();
        assertEquals(AppointmentStatus.COMPLETED, persisted.getStatus());
    }

    @Test
    void doctorCannotCompleteRequestedAppointment() throws Exception {
        User patientUser = saveUser("complete-requested-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Requested Patient", "5551000023");
        User doctorUser = saveUser("complete-requested-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Requested", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(14, 30),
                "Cannot complete",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void differentDoctorCannotConfirmRejectOrCompleteAppointment() throws Exception {
        User patientUser = saveUser("different-doctor-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Different Patient", "5551000024");

        User assignedDoctorUser = saveUser("different-assigned@example.com", UserRole.DOCTOR);
        Doctor assignedDoctor = saveDoctor(assignedDoctorUser, "Dr. Assigned", true);
        User anotherDoctorUser = saveUser("different-another@example.com", UserRole.DOCTOR);
        saveDoctor(anotherDoctorUser, "Dr. Another", true);

        Appointment requested = saveAppointment(
                patient,
                assignedDoctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(15, 30),
                "Protected",
                AppointmentStatus.REQUESTED);
        Appointment confirmed = saveAppointment(
                patient,
                assignedDoctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(16, 30),
                "Protected confirmed",
                AppointmentStatus.CONFIRMED);

        String token = jwtService.generateToken(anotherDoctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/confirm", requested.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/reject", requested.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", confirmed.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void invalidTransitionsReturnConflict() throws Exception {
        User patientUser = saveUser("invalid-transition-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Invalid Transition Patient", "5551000025");
        User doctorUser = saveUser("invalid-transition-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Invalid", true);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(2),
                LocalTime.of(17, 0),
                "Invalid transition",
                AppointmentStatus.CONFIRMED);

        String token = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/reject", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void unauthenticatedPatientEndpointReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/appointments/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticatedDoctorEndpointReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/doctor/appointments"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patientCannotAccessDoctorWorkflowEndpoints() throws Exception {
        User patientUser = saveUser("security-patient@example.com", UserRole.PATIENT);
        savePatient(patientUser, "Security Patient", "5551000026");
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(get("/api/doctor/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void doctorCannotAccessPatientBookingOrCancellationEndpoints() throws Exception {
        User doctorUser = saveUser("security-doctor@example.com", UserRole.DOCTOR);
        saveDoctor(doctorUser, "Dr. Security", true);
        String token = jwtService.generateToken(doctorUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        1L,
                        LocalDate.now().plusDays(1),
                        LocalTime.of(9, 0),
                        "Should fail"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/appointments/1/cancel")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCannotPerformPatientOrDoctorAppointmentActions() throws Exception {
        User adminUser = saveUser("security-admin@example.com", UserRole.ADMIN);
        String token = jwtService.generateToken(adminUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        1L,
                        LocalDate.now().plusDays(1),
                        LocalTime.of(9, 0),
                        "Should fail"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/doctor/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void responseDoesNotExposeSensitiveOrEntityRelationshipFields() throws Exception {
        User patientUser = saveUser("safe-response-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Safe Response Patient", "5551000027");
        Doctor doctor = saveDoctor("safe-response-doctor@example.com", "Dr. Safe", true);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().plusDays(1),
                        LocalTime.of(18, 0),
                        "Safety"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.patientId").value(patient.getId()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.user").doesNotExist())
                .andExpect(jsonPath("$.patient.user").doesNotExist())
                .andExpect(jsonPath("$.doctor.user").doesNotExist());
    }

    @Test
    void creationPersistsPatientDoctorDateTimeReasonAndRequestedStatus() throws Exception {
        User patientUser = saveUser("persist-create-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Persist Create", "5551000028");
        Doctor doctor = saveDoctor("persist-create-doctor@example.com", "Dr. Persist", true);
        String token = jwtService.generateToken(patientUser);

        LocalDate appointmentDate = LocalDate.now().plusDays(5);
        LocalTime appointmentTime = LocalTime.of(8, 45);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        appointmentDate,
                        appointmentTime,
                        "Persistence check"))))
                .andExpect(status().isCreated());

        Appointment persisted = appointmentRepository.findAll().get(0);
        assertEquals(patient.getId(), persisted.getPatient().getId());
        assertEquals(doctor.getId(), persisted.getDoctor().getId());
        assertEquals(appointmentDate, persisted.getAppointmentDate());
        assertEquals(appointmentTime, persisted.getAppointmentTime());
        assertEquals("Persistence check", persisted.getReason());
        assertEquals(AppointmentStatus.REQUESTED, persisted.getStatus());
    }

    @Test
    void statusTransitionsPersistToDatabase() throws Exception {
        User patientUser = saveUser("persist-transition-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "Persist Transition", "5551000029");
        User doctorUser = saveUser("persist-transition-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. Transition", true);
        savePolicy(
                patient,
                "POL-PERSIST-001",
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(30),
                PolicyStatus.ACTIVE);
        Appointment appointment = saveAppointment(
                patient,
                doctor,
                LocalDate.now().plusDays(3),
                LocalTime.of(10, 15),
                "Transition",
                AppointmentStatus.REQUESTED);

        String doctorToken = jwtService.generateToken(doctorUser);

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/confirm", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isOk());

        Appointment confirmed = appointmentRepository.findById(appointment.getId()).orElseThrow();
        assertEquals(AppointmentStatus.CONFIRMED, confirmed.getStatus());

        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/complete", appointment.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isOk());

        Appointment completed = appointmentRepository.findById(appointment.getId()).orElseThrow();
        assertEquals(AppointmentStatus.COMPLETED, completed.getStatus());
    }

    @Test
    void bookingRoundTripsExactLocalDateAndTimeWithoutTimezoneShift() throws Exception {
        User patientUser = saveUser("tz-roundtrip-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "TZ Roundtrip", "5551000030");
        Doctor doctor = saveDoctor("tz-roundtrip-doctor@example.com", "Dr. TZ", true);
        String token = jwtService.generateToken(patientUser);

        LocalDate expectedDate = LocalDate.of(2026, 8, 15);
        LocalTime expectedTime = LocalTime.of(10, 30);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        expectedDate,
                        expectedTime,
                        "Routine cardiology consultation"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.appointmentDate").value("2026-08-15"))
                .andExpect(jsonPath("$.appointmentTime").value("10:30:00"));

        Appointment persisted = appointmentRepository.findAll().get(0);
        assertEquals(expectedDate, persisted.getAppointmentDate());
        assertEquals(expectedTime, persisted.getAppointmentTime());

        Appointment reloaded = appointmentRepository.findById(persisted.getId()).orElseThrow();
        assertEquals(expectedDate, reloaded.getAppointmentDate());
        assertEquals(expectedTime, reloaded.getAppointmentTime());
    }

    @Test
    void conflictCheckUsesUnchangedLocalTimeValue() throws Exception {
        User firstPatientUser = saveUser("tz-conflict-patient-1@example.com", UserRole.PATIENT);
        Patient firstPatient = savePatient(firstPatientUser, "TZ Conflict 1", "5551000031");
        User secondPatientUser = saveUser("tz-conflict-patient-2@example.com", UserRole.PATIENT);
        savePatient(secondPatientUser, "TZ Conflict 2", "5551000032");
        Doctor doctor = saveDoctor("tz-conflict-doctor@example.com", "Dr. TZ Conflict", true);

        LocalDate expectedDate = LocalDate.of(2026, 8, 15);
        LocalTime expectedTime = LocalTime.of(10, 30);

        saveAppointment(
                firstPatient,
                doctor,
                expectedDate,
                expectedTime,
                "Existing at 10:30",
                AppointmentStatus.REQUESTED);

        String token = jwtService.generateToken(secondPatientUser);
        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        expectedDate,
                        expectedTime,
                        "Attempt same 10:30"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void auditTimestampsRemainPresentAndUpdateOnStatusChange() throws Exception {
        User patientUser = saveUser("tz-audit-patient@example.com", UserRole.PATIENT);
        Patient patient = savePatient(patientUser, "TZ Audit Patient", "5551000033");
        User doctorUser = saveUser("tz-audit-doctor@example.com", UserRole.DOCTOR);
        Doctor doctor = saveDoctor(doctorUser, "Dr. TZ Audit", true);
        String token = jwtService.generateToken(patientUser);

        mockMvc.perform(post("/api/appointments")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(buildCreatePayload(
                        doctor.getId(),
                        LocalDate.now().plusDays(5),
                        LocalTime.of(10, 30),
                        "Audit check"))))
                .andExpect(status().isCreated());

        Appointment created = appointmentRepository.findAll().get(0);
        assertNotNull(created.getCreatedAt());
        assertNotNull(created.getUpdatedAt());

        LocalDateTime createdAt = created.getCreatedAt();
        LocalDateTime initialUpdatedAt = created.getUpdatedAt();

        String doctorToken = jwtService.generateToken(doctorUser);
        mockMvc.perform(patch("/api/doctor/appointments/{appointmentId}/confirm", created.getId())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + doctorToken))
                .andExpect(status().isOk());

        Appointment updated = appointmentRepository.findById(created.getId()).orElseThrow();
        assertNotNull(updated.getCreatedAt());
        assertNotNull(updated.getUpdatedAt());
        assertEquals(createdAt, updated.getCreatedAt());
        assertTrue(!updated.getUpdatedAt().isBefore(initialUpdatedAt));
    }

    private Map<String, Object> buildCreatePayload(
            Long doctorId,
            LocalDate appointmentDate,
            LocalTime appointmentTime,
            String reason) {

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("doctorId", doctorId);
        payload.put("appointmentDate", appointmentDate.toString());
        payload.put("appointmentTime", appointmentTime.toString());
        payload.put("reason", reason);
        return payload;
    }

    private User saveUser(String email, UserRole role) {
        User user = new User(email, "hashed-password", role, AccountStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Patient savePatient(User user, String fullName, String phone) {
        Patient patient = new Patient(user, fullName, phone);
        return patientRepository.save(patient);
    }

    private Doctor saveDoctor(String email, String fullName, boolean availableForAppointments) {
        User user = saveUser(email, UserRole.DOCTOR);
        return saveDoctor(user, fullName, availableForAppointments);
    }

    private Doctor saveDoctor(User user, String fullName, boolean availableForAppointments) {
        Doctor doctor = new Doctor(
                user,
                fullName,
                "General Medicine",
                "LIC-" + user.getEmail().hashCode(),
                "5559990000",
                new BigDecimal("120.00"));
        doctor.setClinicAddress("10 Care Avenue");
        doctor.setAvailableForAppointments(availableForAppointments);
        return doctorRepository.save(doctor);
    }

    private Appointment saveAppointment(
            Patient patient,
            Doctor doctor,
            LocalDate date,
            LocalTime time,
            String reason,
            AppointmentStatus status) {

        Appointment appointment = new Appointment(patient, doctor, date, time, reason);
        appointment.setStatus(status);
        return appointmentRepository.save(appointment);
    }

        private InsurancePolicy savePolicy(
                        Patient patient,
                        String policyNumber,
                        LocalDate startDate,
                        LocalDate endDate,
                        PolicyStatus status) {

                InsurancePolicy policy = new InsurancePolicy(
                                patient,
                                "TrustCare",
                                policyNumber,
                                new BigDecimal("80.00"),
                                new BigDecimal("25.00"),
                                startDate,
                                endDate);
                policy.setStatus(status);
                return insurancePolicyRepository.save(policy);
        }
}
