package com.tarantulapp.dto;

public class AuthRegistrationPolicyResponse {
    private String mode;
    private boolean registrationOpen;

    public AuthRegistrationPolicyResponse(String mode, boolean registrationOpen) {
        this.mode = mode;
        this.registrationOpen = registrationOpen;
    }

    public String getMode() {
        return mode;
    }

    public boolean isRegistrationOpen() {
        return registrationOpen;
    }
}
