# Security Policy

TarantulApp is in internal testing on Google Play and is preparing for App Store submission. This file describes how to report vulnerabilities and what response to expect.

## Reporting a vulnerability

Email **security@tarantulapp.com** with:

- A short description of the issue and its impact
- Reproduction steps (sample request / payload / screenshots)
- Affected version, platform (web / Android), and account/email used (if any)
- Whether the bug has been disclosed elsewhere

If you can't use email, open a private issue via GitHub Security Advisories on the repo.

**Please do not** open a public issue, post in social channels, or share PoCs publicly until we've coordinated a fix.

## What to expect

| Stage | SLA |
|---|---|
| Acknowledgement | within 48 hours |
| Triage / severity assignment | within 5 business days |
| Fix for HIGH / CRITICAL | within 7 calendar days |
| Fix for MEDIUM | within 30 days |
| Fix for LOW | best effort, next release window |

Severity follows the CVSS v3.1 base score. Issues that allow account takeover, payment fraud, mass PII exfiltration, or RCE are CRITICAL by default.

## Scope

In scope:

- `tarantulapp.com` and `*.tarantulapp.com` (production frontend on Vercel)
- `api.tarantulapp.com` (production backend on Railway)
- The Google Play release of `com.tarantulapp.app`
- Source in this repository (`backend/`, `frontend/`, `frontend/android/`)

Out of scope:

- Findings in third-party services (Stripe, Cloudinary, Supabase, Sentry, Vercel, Railway, Google Play). Report those upstream.
- Reports based purely on automated scanner output without a working PoC.
- Self-XSS, missing best-practice headers we already document elsewhere, and rate-limit findings under 100 req/min from a single IP.
- Social engineering, physical attacks, attacks on infrastructure we don't own.
- Internal testing builds with debug flags (`GOOGLE_PLAY_BILLING_MODE=stub`, dev seed users).

## No bug bounty (yet)

There is currently no formal monetary bug bounty program. We credit researchers in release notes for confirmed valid reports unless they prefer to remain anonymous.

## Coordinated disclosure

We aim to ship a fix and notify affected users (when applicable) before public disclosure. We will coordinate timing and credit with you in advance and request a 90-day embargo from initial report for non-CRITICAL issues.
