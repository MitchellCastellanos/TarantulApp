package com.tarantulapp.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;


public class RegisterRequest {

    @NotBlank(message = "El email es obligatorio")
    @Email(message = "Formato de email inválido")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria")
    @Size(min = 6, max = 100, message = "La contraseña debe tener entre 6 y 100 caracteres")
    private String password;

    private String displayName;

    /** Codigo de referido opcional (mismo formato que URL ?ref=). */
    @Size(max = 32)
    private String referralCode;

    /** Token de hCaptcha resuelto en el cliente. Se valida en {@code CaptchaService}. */
    @Size(max = 4096)
    private String captchaToken;

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String referralCode) { this.referralCode = referralCode; }

    public String getCaptchaToken() { return captchaToken; }
    public void setCaptchaToken(String captchaToken) { this.captchaToken = captchaToken; }
}
