# TarantulApp — Modèle d’e-mail (accès anticipé — inscription prête)

À utiliser avec `buildFrenchBetaWelcomeEmail()` dans `frontend/src/utils/welcomeBetaEmail.js`, ou en copiant la structure ci-dessous.

**Objectif :** Accueillir comme **utilisateur**. Confirmer que l’**inscription à l’accès anticipé est prête**, **confirmer l’accès**, et rappeler comment **télécharger** (Android), **se connecter sur le web** et **vérifier la bonne adresse e-mail**. Pas de WhatsApp ni de liens de groupe dans cet e-mail.

**Note technique :** Android utilise encore une fiche Play en **accès anticipé** ; mêmes identifiants que le site. Ancien **test interne** → réinstaller depuis le lien Play ci-dessous.

**Variables :** `{{name}}`, `{{appUrl}}`, `{{email}}`, `{{password}}`, `{{date}}` / `{{sendDate}}`, `{{androidPlayUrl}}`

---

Bonjour {{name}},

Date du message : {{date}}

Votre **inscription à l’accès anticipé TarantulApp est prête**. Bienvenue : ce message **confirme votre accès** et rappelle comment **télécharger l’app**, **vous connecter sur le web** et **vérifier votre e-mail**.

Sur Android, l’installation passe encore par une fiche Play en **accès anticipé** ; à l’ouverture **publique**, les mises à jour seront comme pour n’importe quelle app et **votre compte reste le même**.

### Télécharger l’app (Android — Google Play)

1. Ouvrez sur le téléphone : `{{androidPlayUrl}}`
2. Compte **Google** avec invitation **accès anticipé** sur le Play Store. Si accès refusé, changez de compte sur l’appareil ou dans l’app Play Store.
3. **Installer** ou **Mettre à jour**, ouvrez **TarantulApp**, connectez-vous avec **Vos identifiants** ci-dessous — comme sur le site.

Ancien lien de **test interne** → réinstallez depuis le lien ci-dessus.

### Vérifier votre e-mail (important)

- **TarantulApp :** connectez-vous avec **exactement** `{{email}}` et le mot de passe ci-dessous.
- **Google :** n’affiche que la fiche Play ; **pas** votre mot de passe TarantulApp.

### Connexion web (n’importe quel appareil)

1. `{{appUrl}}`

2. Option de connexion **accès anticipé** sur l’accueil (peut indiquer **« Beta tester login »**).

3. Même e-mail et mot de passe qu’au-dessous.

**Raccourci :** iPhone/iPad — Safari → Partager → sur l’écran d’accueil. Android — Chrome ou app Play.

### Vos identifiants

- **Web :** `{{appUrl}}`
- **Android (Play — accès anticipé) :** `{{androidPlayUrl}}`
- **E-mail :** `{{email}}`
- **Mot de passe :** `{{password}}`

Voir **« Report a bug »** ou des mentions d’accès anticipé est normal pendant les finitions.

### Quelques possibilités dans TarantulApp

- **Collection** — araignées, photos, notes, état.
- **Nourrissures, mues, rappels** au quotidien.
- **Fil communautaire**, **profil d’éleveur**, **marketplace** si vous l’utilisez.

Pour toute question, **répondez à cet e-mail** ou utilisez **« Report a bug »** dans l’app. Merci !

— L’équipe TarantulApp
