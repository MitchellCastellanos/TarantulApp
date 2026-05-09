# TarantulApp — English welcome email template (closed beta)

Use with `buildEnglishBetaWelcomeEmail()` in `frontend/src/utils/welcomeBetaEmail.js`, or copy the structure below.

**Batch note (May 2026):** Android installs use the **Google Play Store listing** for our **closed testing** track — testers open the Play link, install or update, then sign in with the same credentials as the web app. Anyone who used the old **internal testing** link should reinstall from the Store link below.

**Variables:** `{{name}}`, `{{appUrl}}` (e.g. `https://tarantulapp.com`), `{{email}}`, `{{password}}`, `{{date}}` / `{{sendDate}}`, `{{androidPlayUrl}}` (Play Store listing URL, same as in-app)

---

Hi {{name}},

Message date: {{date}}

Congratulations — you’ve been accepted into the TarantulApp closed beta. Among everyone who applied, you’re one of the few helping us shape the platform before public launch.

Important for this batch:

- Install the **Android app** from Google Play (**closed testing**). Link: `{{androidPlayUrl}}`
- On your phone, open that link while signed into the **Google account** that has access to the test, install or update TarantulApp, then sign in with the **same email and password** as below.
- If you previously used the **internal testing** install URL, stop using it — uninstall that build if needed and reinstall from the Store link above.
- The **web app** still works everywhere — use Safari/Chrome as before if you prefer.

Join our WhatsApp group for testers (English):

- (group link from template)

How to sign in (web):

1. Open {{appUrl}} and use the beta gate (“Beta tester login”) on the public home screen.
2. Sign in with the email and password below (provision the password in admin if needed).

Web app on your phone (shortcut):

- iPhone/iPad: Safari → Share → “Add to Home Screen”.
- Android (Chrome): Menu → “Install app” or “Add to Home screen” when offered — or use the native app from Play above.

What you need to know:

1) Your access

- Web: {{appUrl}}
- Android (Play — closed testing): {{androidPlayUrl}}
- Email: {{email}}
- Password: {{password}}

Your account is flagged as a beta tester — you’ll see beta features and the “Report a bug” button.

2) The 6-week plan

- Week 0 — Set up your account and import your collection.
- Weeks 1–2 — Day-to-day: feeds, molts, photos, reminders.
- Weeks 3–4 — Community feed, keeper profile, marketplace, chat.
- Week 5 — Pro trial, QR labels, polish.
- Week 6 — Final survey + your testimonial.

3) How to send feedback

- Bugs: tap “Report a bug” in the app — it attaches page, device, and version.
- Ideas / questions: reply to this email.
- The Week 1 mission is already included here as your first steps; we’ll follow up with the next weeks after that.

4) What we ask

- Use the app a few minutes a day, 3+ days per week.
- Send at least one piece of feedback per week (bug, idea, or “all good”).
- Be honest — we prefer “this is confusing” over polite silence.

Thanks for trusting us with your collection. Let’s build the best tarantula app together.

— The TarantulApp team
