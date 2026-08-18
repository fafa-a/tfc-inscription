# User-Side Setup — HelloAsso + Supabase

Tâches à faire de ton côté (compte, DB, déploiement). Aucune de ces étapes ne touche au code source.

---

## 1. Compte HelloAsso (Sandbox pour les tests)

> ⚠️ **Sandbox ≠ Production.** Le sandbox est un environnement séparé avec ses propres URLs et son propre compte.

### 1a. Environnement Sandbox (test)

- [ ] Créer l'association fictive sur **`https://auth.helloasso-sandbox.com/inscription`** (PAS le site de prod)
- [ ] **Valider le compte sandbox avec des documents FICTIFS** (obligatoire pour recevoir un premier paiement en sandbox — c'est ce qui bloque la demande depuis 5 jours)
- [ ] Récupérer `client_id` / `client_secret` de l'app API sandbox
- [ ] Accorder l'autorisation **`Checkout`** à l'app
- [ ] API sandbox : `https://api.helloasso-sandbox.com`

### 1b. Environnement Production (quand l'asso réelle sera validée)

- [ ] Créer l'app API sur https://www.helloasso.com
- [ ] Récupérer `client_id` / `client_secret`
- [ ] Accorder **`Checkout`** + (webhook) `AccessPublicData` + rôle `OrganizationAdmin`
- [ ] Noter le `organization_slug`
- [ ] API prod : `https://api.helloasso.com`

> ⚠️ Le `client_secret` ne doit **jamais** être exposé côté navigateur. L'OAuth2 `client_credentials` et la création du checkout intent s'exécutent désormais dans l'Edge Function `helloasso-checkout`. Les secrets HelloAsso sont donc des secrets Supabase, pas des variables `VITE_*`.

---

## 2. Variables d'environnement `.env`

Le frontend n'a plus besoin d'aucune variable HelloAsso. Le `.env` ne contient que :

```env
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx
```

Les identifiants HelloAsso sont définis comme secrets de l'Edge Function (voir section 4).

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

## 4. Déployer les Edge Functions

```bash
supabase functions deploy helloasso-checkout
supabase functions deploy helloasso-webhook
```

Puis définir les secrets :

```bash
supabase secrets set \
  HELLOASSO_CLIENT_ID=<client_id> \
  HELLOASSO_CLIENT_SECRET=<client_secret> \
  HELLOASSO_ORGANIZATION_SLUG=<organization_slug> \
  HELLOASSO_WEBHOOK_SECRET=<signatureKey_du_webhook> \
  SUPABASE_URL=https://<projet>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

> La `service_role_key` se trouve dans `Project Settings → API`.
> `HELLOASSO_WEBHOOK_SECRET` doit être le `signatureKey` renvoyé par la configuration du webhook (section 5), pas un secret arbitraire.

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
| `HELLOASSO_CLIENT_ID` | Portail développeur HelloAsso (secret Edge Function) |
| `HELLOASSO_CLIENT_SECRET` | Portail développeur HelloAsso (secret Edge Function) |
| `HELLOASSO_ORGANIZATION_SLUG` | URL du dashboard org (secret Edge Function) |
| `HELLOASSO_WEBHOOK_SECRET` | `signatureKey` renvoyé par l'API de config du webhook |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
