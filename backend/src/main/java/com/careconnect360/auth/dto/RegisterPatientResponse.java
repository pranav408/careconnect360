package com.careconnect360.auth.dto;

public class RegisterPatientResponse {

    private final Long userId;
    private final Long patientId;
    private final String email;
    private final String fullName;
    private final String role;
    private final String status;
    private final String message;

    public RegisterPatientResponse(
            Long userId,
            Long patientId,
            String email,
            String fullName,
            String role,
            String status,
            String message) {

        this.userId = userId;
        this.patientId = patientId;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.status = status;
        this.message = message;
    }

    public Long getUserId() {
        return userId;
    }

    public Long getPatientId() {
        return patientId;
    }

    public String getEmail() {
        return email;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }

    public String getMessage() {
        return message;
    }
}