package com.tarantulapp.config;

import com.tarantulapp.entity.User;
import com.tarantulapp.entity.UserPlan;
import com.tarantulapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Crea el usuario de prueba solo con perfil {@code local} o {@code dev} y
 * {@code app.dev-seed-user=true}. En la nube (sin esos perfiles) este bean no existe.
 */
@Component
@Profile({"local", "dev"})
@ConditionalOnProperty(name = "app.dev-seed-user", havingValue = "true")
public class LocalDevUserSeed implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalDevUserSeed.class);

    public static final String DEV_EMAIL = "dev@tarantulapp.local";
    public static final String DEV_PASSWORD = "LocalDev123!";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LocalDevUserSeed(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByEmail(DEV_EMAIL)) {
            return;
        }
        User user = new User();
        user.setEmail(DEV_EMAIL);
        user.setDisplayName("Dev Local");
        user.setPasswordHash(passwordEncoder.encode(DEV_PASSWORD));
        user.setPlan(UserPlan.PRO);
        userRepository.save(user);
        log.warn("Usuario de desarrollo creado: {} (plan PRO). Credenciales: ver application-local.properties.SAMPLE",
                DEV_EMAIL);
    }
}
