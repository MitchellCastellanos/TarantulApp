package com.tarantulapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    @NotBlank(message = "CURRENT_PASSWORD_REQUIRED")
    private String currentPassword;

    @NotBlank(message = "NEW_PASSWORD_REQUIRED")
    @Size(min = 6, max = 100, message = "PASSWORD_LENGTH")
    private String newPassword;

    public String getCurrentPassword() { return currentPassword; }
    public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

    public String getNewPassword() { return newPassword; }
    public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
}
