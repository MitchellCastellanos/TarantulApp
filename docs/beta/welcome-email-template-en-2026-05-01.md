# TarantulApp — English welcome email template (closed beta, batch 1)

Use with `buildEnglishBetaWelcomeEmail()` in `frontend/src/utils/welcomeBetaEmail.js`, or copy the structure below.

**Batch note (May 2026):** Android Play Store build is a few days out — web app + PWA install first. Weekend exploration; **Monday** = weekly mission emails start.

**Variables:** `{{name}}`, `{{appUrl}}` (e.g. `https://tarantulapp.com`), `{{email}}`, `{{password}}`, `{{date}}`

---

Hi {{name}},

Message date: {{date}}

Congratulations — you’ve been accepted into the TarantulApp closed beta. Among everyone who applied, you’re one of the few helping us shape the platform before public launch.

Important for this first batch:

- Native Android on Play Store is shipping in the next few days; for now please focus on the web app.
- Over the weekend, explore the product, set up your account, and add your collection. On Monday you’ll get the week’s missions by email.

How to sign in:

1. Open {{appUrl}} and use the beta gate (“Beta tester login”) on the pre-launch screen.
2. Sign in with the email and password below (provision the password in admin if needed).

Web app on your phone:

- iPhone/iPad: Safari → Share → “Add to Home Screen”.
- Android (Chrome): Menu → “Install app” or “Add to Home screen” when offered.
- Android testers will receive Play Store access to install and test directly in the coming days.

What you need to know:

1) Your access

- Web: {{appUrl}}
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
- Each Monday you’ll get a short email with the weekly mission.

4) What we ask

- Use the app a few minutes a day, 3+ days per week.
- Send at least one piece of feedback per week (bug, idea, or “all good”).
- Be honest — we prefer “this is confusing” over polite silence.

Thanks for trusting us with your collection. Let’s build the best tarantula app together.

— The TarantulApp team
