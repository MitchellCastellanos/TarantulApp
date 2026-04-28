package com.tarantulapp.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.UUID;

/**
 * UserDetails that carries the user's database UUID so downstream code
 * (JwtAuthFilter MDC, SecurityHelper) can read the id without an extra DB round-trip.
 */
public record AppUserDetails(UUID id, String email, String passwordHash)
        implements UserDetails {

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.emptyList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }
}
