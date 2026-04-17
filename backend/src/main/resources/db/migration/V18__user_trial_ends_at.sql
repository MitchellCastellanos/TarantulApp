-- Período de prueba: usuarios nuevos reciben trial_ends_at al registrarse.
-- NULL = cuentas anteriores al cambio (comportamiento FREE completo, sin bloqueo lectura).
ALTER TABLE users ADD COLUMN trial_ends_at TIMESTAMP NULL;
