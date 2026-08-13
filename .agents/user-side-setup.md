# User-Side Setup — HelloAsso + Supabase

Tâches à faire de ton côté (compte, DB, déploiement). Aucune de ces étapes ne touche au code source.

---

## 1. Compte HelloAsso

- [ ] Créer un compte sur https://www.helloasso.com
- [ ] Créer (ou rejoindre) une **organisation** (le club)
- [ ] Aller sur le portail développeur : https://developer.helloasso.com (ou `Mon organisation` → `Développeurs`)
- [ ] Créer une **application API** → récupérer :
  - `client_id`
  - `client_secret`
- [ ] **Accorder l'autorisation `Checkout`** à l'application API (obligatoire pour créer des checkout intents, sinon 403)
- [ ] Pour le webhook : accorder `AccessPublicData` + rôle `OrganizationAdmin` au token
- [ ] Noter le **slug** de l'organisation (visible dans l'URL du dashboard, ex: `tfc-club`)

> ⚠️ Le secret n'est utilisé QUE si l'on déplace l'OAuth2 vers une Edge Function. Tant que le code tourne côté navigateur, il sera exposé (à corriger — voir vulnérabilité signalée).

---

## 2. Variables d'environnement `.env`

Ajouter au fichier `.env` (copier depuis `.env.example`) :

```env
VITE_HELLOASSO_CLIENT_ID=xxx
VITE_HELLOASSO_CLIENT_SECRET=xxx
VITE_HELLOASSO_ORGANIZATION_SLUG=xxx
```

---

## 3. Migration Supabase (SQL)

À exécuter dans le SQL Editor de Supabase :

```sql
-- 1. Colonne pour lier le membre au checkout intent HelloAsso
alter table public.members
  add column if not exists helloasso_checkout_intent_id text;

-- 2. Flag de validation du profil (false par défaut)
alter table public.members
  add column if not exists is_profile_validated boolean not null default false;

-- 3. Autoriser 'helloasso' comme méthode de paiement
--    Si payment_method est un enum, l'ajouter ; sinon assouplir la contrainte.
alter table public.subscriptions
  drop constraint if exists subscriptions_payment_method_check;

alter table public.subscriptions
  add constraint subscriptions_payment_method_check
  check (payment_method in ('card', 'helloasso'));
```

> Vérifie d'abord le type réel de `subscriptions.payment_method` (enum ou text+check). Si c'est un `enum`, utilise :
> ```sql
> alter type public.payment_method_enum add value if not exists 'helloasso';
> ```

---

## 4. Déployer l'Edge Function

```bash
supabase functions deploy helloasso-webhook
```

Puis définir les secrets :

```bash
supabase secrets set \
  HELLOASSO_WEBHOOK_SECRET=<cle_aleatoire_forte> \
  SUPABASE_URL=https://<projet>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

> La `service_role_key` se trouve dans `Project Settings → API`.

---

## 5. Configurer le webhook HelloAsso (via API)

Le webhook se configure **via l'API** (pas dans le dashboard) :

```bash
curl -X PUT \
  "https://api.helloasso.com/v5/partners/me/api-notifications/organizations/<ORGANIZATION_SLUG>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<projet>.supabase.co/functions/v1/helloasso-webhook", "notificationType": "Payment"}'
```

- [ ] La réponse contient un **`signatureKey`** → c'est lui qu'il faut reporter dans le secret `HELLOASSO_WEBHOOK_SECRET` de l'Edge Function
- [ ] Répéter pour `notificationType: "Order"` (ou omettre `notificationType` pour l'URL principale)
- [ ] Types disponibles : `Payment`, `Order`, `Form`, `Organization`

---

## 6. Test en sandbox

- [ ] Utiliser l'environnement **sandbox** HelloAsso (URL de checkout sandbox)
- [ ] Faire une inscription test → payer → vérifier `subscriptions.payment_status` passe à `'paid'`
- [ ] Vérifier la réception du webhook (logs Edge Function)

---

## Récap des valeurs à collecter

| Valeur | Où |
|---|---|
| `VITE_HELLOASSO_CLIENT_ID` | Portail développeur HelloAsso |
| `VITE_HELLOASSO_CLIENT_SECRET` | Portail développeur HelloAsso |
| `VITE_HELLOASSO_ORGANIZATION_SLUG` | URL du dashboard org |
| `HELLOASSO_WEBHOOK_SECRET` | À générer (aléatoire fort) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
