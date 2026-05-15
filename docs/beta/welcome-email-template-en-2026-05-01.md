# TarantulApp — English welcome email template (early access — registration ready)

Use with `buildEnglishBetaWelcomeEmail()` in `frontend/src/utils/welcomeBetaEmail.js`, or copy the structure below.

**Purpose:** Welcome people as **users**. Confirm that their **early access registration is ready**, confirm **access**, and give clear steps to **download** (Android), **sign in** on the web, and **verify the correct email**. No WhatsApp / external community links in this email.

**Technical note:** Android uses Google Play’s **early-access** listing today; same credentials as the web. Old **internal testing** link users should reinstall from the Store link below.

**Variables:** `{{name}}`, `{{appUrl}}`, `{{email}}`, `{{password}}`, `{{date}}` / `{{sendDate}}`, `{{androidPlayUrl}}`

---

Hi {{name}},

Message date: {{date}}

Your **TarantulApp early access registration is ready**. Welcome — this email **confirms your access** and walks you through **downloading the app (Android)**, **signing in on the web**, and **making sure you’re on the correct email address**.

On Android, installs still use Google Play’s **early-access listing** for now; when we move to the **public** store listing, updates work like any other app and **your account stays the same**.

### Download the app (Android — Google Play)

1. On your **Android phone**, open: `{{androidPlayUrl}}`
2. Use the **Google account** that has the Play **early-access** invite. If Play denies access, switch accounts on the device or in the Play Store app and try again.
3. **Install** or **Update**, open **TarantulApp**, then sign in with **Your login** below — same as the website.

If you used the old **internal testing** URL, reinstall from the Store link above.

### Double-check your email (important)

- **TarantulApp:** sign in with **exactly** `{{email}}` and the password below.
- **Google:** only controls visibility of the Play listing; **not** your TarantulApp password.

### Sign in on the web (any device)

1. Open `{{appUrl}}`
2. Use the early-access sign-in on the public home (may read **“Beta tester login”**).
3. Same email and password as below.

**Phone shortcut:** iPhone/iPad — Safari → Share → Add to Home Screen. Android — Chrome install / add to home, or the Play app from the link above.

### Your login

- **Web:** `{{appUrl}}`
- **Android (Play — early access):** `{{androidPlayUrl}}`
- **Email:** `{{email}}`
- **Password:** `{{password}}`

Seeing **“Report a bug”** or early-access wording is normal while we polish.

### A few things you can do in TarantulApp

- **Collection** — spiders with photos, notes, status.
- **Feedings, molts, reminders** for daily care.
- **Community**, **keeper profile**, **marketplace** when you use them.

If anything looks off, **reply to this email** or use **“Report a bug”** in the app (page, device, version). Thanks for being with us!

— The TarantulApp team
