package com.careconnect360.auth.dto;

public class LoginResponse {

    private final String accessToken;
    private final String tokenType;
    private final long expiresInSeconds;
    private final Long userId;
    private final String email;
    private final String role;
    private final String status;
    private final String message;

    public LoginResponse(
            String accessToken,
            String tokenType,
            long expiresInSeconds,
            Long userId,
            String email,
            String role,
            String status,
            String message) {

        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.expiresInSeconds = expiresInSeconds;
        this.userId = userId;
        this.email = email;
        this.role = role;
        this.status = status;
        this.message = message;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public long getExpiresInSeconds() {
        return expiresInSeconds;
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

    public String getMessage() {
        return message;
    }
}