package com.tarantulapp.dto;

import java.util.UUID;

public class AuthResponse {

    private String token;
    private String email;
    private String displayName;
    private UUID userId;

    public AuthResponse(String token, String email, String displayName, UUID userId) {
        this.token = token;
        this.email = email;
        this.displayName = displayName;
        this.userId = userId;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public String getDisplayName() { return displayName; }
    public UUID getUserId() { return userId; }
}
