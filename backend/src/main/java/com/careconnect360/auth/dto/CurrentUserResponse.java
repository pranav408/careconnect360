package com.careconnect360.auth.dto;

public class CurrentUserResponse {

    private final Long userId;
    private final String email;
    private final String role;
    private final String status;

    public CurrentUserResponse(
            Long userId,
            String email,
            String role,
            String status) {

        this.userId = userId;
        this.email = email;
        this.role = role;
        this.status = status;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEmail() {
        return email;
    }

    public String getRole() {
        return role;
    }

    public String getStatus() {
        return status;
    }
}