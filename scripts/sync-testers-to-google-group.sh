#!/usr/bin/env bash
# Retry joining all pending users to the Play testing Google Group (Admin SDK Directory API).
# Requires DB_* (or spring.datasource.*), GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY,
# GOOGLE_ADMIN_IMPERSONATE_EMAIL, GOOGLE_TESTERS_GROUP_EMAIL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
exec mvn -q spring-boot:run "-Dspring-boot.run.profiles=sync-google-group"
