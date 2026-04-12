-- V1: Tabla de usuarios
CREATE TABLE users (
    id            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    email         VARCHAR(255)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    display_name  VARCHAR(100)     NULL,
    created_at    DATETIME2        NOT NULL DEFAULT GETDATE(),
    CONSTRAINT pk_users      PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);
