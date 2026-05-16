# TarantulApp — E-mail de bienvenue boutique / vendeur (Mexique)

**Quand l'envoyer :** Après avoir parlé au prospect, reçu son e-mail et **activé son compte dans l'admin** (`verifiedBreeder` + storefront). Cet e-mail explique « vous pouvez publier maintenant — voici ce que vous avez et ce qu'il faut pour le badge ».

**Variables :** `{{name}}`, `{{businessName}}`, `{{appUrl}}`, `{{email}}`, `{{password}}` (seulement si un mot de passe temporaire a été généré), `{{shopUrl}}`, `{{sellUrl}}`, `{{date}}`, `{{verificationBookingUrl}}` (lien public de prise de rendez-vous, optionnel).

**Modèle de facturation actuel :** Tier dynamique réassigné chaque mois selon les ventes signalées. Starter 0 MXN, ajustement automatique. TarantulApp **ne séquestre pas les paiements** — le vendeur encaisse directement.

**Backend :** `app.vendor-verification-booking-url` / `TARANTULAPP_VENDOR_VERIFICATION_BOOKING_URL` pour l'URL dans `BetaMailBodies` (`vendor_welcome_mx`).

---

Bonjour {{name}},

Date du message : {{date}}

Merci d'apporter **{{businessName}}** à **TarantulApp**. Nous avons activé votre **compte boutique / vendeur** dans la marketplace — cet e-mail détaille **ce qui est déjà actif, ce qui reste en attente, et comment l'obtenir**.

### Avantages ACTIFS dès aujourd'hui (sans coût initial)

- **Boutique** sur `{{shopUrl}}` avec votre marque, politiques d'envoi et contact.
- **Publication dans toutes les catégories** : mygales, projets d'élevage, nourriture vive, substrats, terrariums et accessoires.
- **Jusqu'à 250 annonces actives** + listing boost.
- **Boîte de réception acheteurs** dans l'app avec historique.
- **Tier dynamique** : vous démarrez en **Vendor Starter (0 MXN / mois)** — monte ou descend selon vos ventes, sans contrat ni engagement.

### Comment fonctionne la facturation (sans séquestre)

TarantulApp **ne touche jamais l'argent de vos ventes** — vous encaissez directement de votre client (virement, MercadoPago, ce que vous utilisez déjà). Votre abonnement mensuel s'ajuste automatiquement selon le nombre d'annonces que vous marquez comme vendues chaque mois :

| Tier | Ventes signalées / mois | Coût mensuel |
|------|------------------------|--------------|
| Vendor Starter | 0–3 | **0 MXN** |
| Vendor Activo | 4–12 | 199 MXN |
| Vendor Plus | 13–30 | 499 MXN |
| Vendor Pro Shop | 31+ | 999 MXN |

À chaque vente conclue, **marquez l'annonce comme vendue** dans l'app — c'est notre seul compteur. Si vous vendez zéro un mois, vous ne payez rien et gardez votre boutique complète. Aucune pénalité à descendre de tier.

**Étiquettes d'activité (en plus de la vérification) :** selon votre tier du mois, la vitrine peut afficher des mentions de confiance supplémentaires (par ex. « Boutique active », « Boutique Plus », « Pro Shop »). **Elles ne remplacent pas** la vérification en visioconférence avec l'équipe.

### Ce qui reste en attente : votre badge **« Boutique Vérifiée »**

Le badge n'est pas donné contre paiement — il s'obtient lors d'un **appel vidéo en direct** avec notre équipe. **N'envoyez pas de photos de pièce d'identité par e-mail** ; la pièce est montrée **à la caméra** sur demande.

**Prise de rendez-vous**

{{#verificationBookingUrl}}
- Prenez rendez-vous ici : `{{verificationBookingUrl}}`
{{/verificationBookingUrl}}
{{^verificationBookingUrl}}
- Répondez à cet e-mail avec le nom de la boutique, votre `@handle` TarantulApp et **2 ou 3 créneaux** possibles (indiquez votre **fuseau horaire**). Nous envoyons le lien de la visio.
{{/verificationBookingUrl}}

**Avant l'appel, préparez**

- Pièce d'identité à portée de main (caméra uniquement — **pas** de pièces jointes par e-mail).
- Espace et terrariums prêts pour une courte visite vidéo.
- Inventaire représentatif ; papier avec `@handle` manuscrit au cas où on vous demande de le montrer près d'un animal.
- WhatsApp / Instagram boutique prêts à afficher si besoin.
- Connexion stable, caméra et lumière correctes.
- Si vous vendez du **CITES** : UMA ou permis à montrer à la caméra.
- Optionnel pour accélérer : identifiant fiscal, références, factures grossiste — vous pouvez les montrer pendant l'appel.

**Enregistrement :** par défaut nous **n'enregistrons pas** la séance. Si un enregistrement était un jour nécessaire, nous demanderions un **consentement distinct** au préalable.

**Durée :** ~15–20 minutes. Après l'appel, l'équipe confirme l'attribution du badge — en général sous **24 à 72 h ouvrées**. Vous pouvez publier entre-temps ; sans badge, la vitrine affiche **« Nouvelle boutique »**.

### Votre accès

- **Web / app :** `{{appUrl}}`
- **E-mail :** `{{email}}`
{{#password}}
- **Mot de passe temporaire :** `{{password}}` (changez-le dans votre compte après la première connexion)
{{/password}}

### Premiers pas (15–30 min)

1. Connectez-vous sur `{{appUrl}}` avec votre e-mail (accès anticipé / bêta le cas échéant).
2. Allez dans **Marketplace → Vendre** (`{{sellUrl}}`).
3. **Configurez votre boutique :** nom commercial, tagline, politique d'envoi (national / par état), délais, et contact WhatsApp ou Instagram.
4. **Publiez votre première annonce :** photo claire, prix en **MXN**, description honnête (taille, sexe, origine le cas échéant).
5. Répétez avec votre inventaire principal (mygales + consommables si vous en proposez).
6. **Prenez rendez-vous** (lien ci-dessus si configuré) **ou** répondez avec des créneaux pour planifier la visio.

### Règles rapides (Mexique)

- Respectez la **réglementation locale** faune, envois et permis pour la vente de spécimens (UMA / CITES le cas échéant).
- TarantulApp **ne séquestre pas les paiements** : concluez la transaction dans le chat de l'app et réglez le paiement entre vous via une méthode déjà connue (virement, MercadoPago, etc.).
- Photos réelles, stock à jour ; une fois vendu, **marquez l'annonce comme vendue** — c'est le seul signal qui compte pour votre tier mensuel.

### Besoin d'aide ?

Répondez à cet e-mail avec des questions de catégories ou votre `@handle`. Si quelque chose ne charge pas dans l'app, utilisez **« Report a bug »** (écran, appareil, version).

Bienvenue dans la marketplace — nous adorons voir le catalogue grandir.

— L'équipe TarantulApp
