# Issues: helloasso-payment

## Issue 1: Remplacer `stripe_customer_id` par le modèle HelloAsso

**Type:** Refactor
**Taille:** S

### Acceptance criteria

- [ ] `MemberInsert.stripe_customer_id` → `MemberInsert.helloasso_checkout_intent_id`
- [ ] `Member.stripe_customer_id` → `Member.helloasso_checkout_intent_id`
- [ ] `generateTempStripeId()` supprimée
- [ ] `insertMemberWithSubscriptions` utilise le nouveau champ
- [ ] `bun test` passe
- [ ] `bun run lint` passe

### Fichiers

- `src/lib/supabase.ts` (modifié)

---

## Issue 2: Créer le client API HelloAsso

**Type:** Feature
**Taille:** M

### Acceptance criteria

- [ ] `src/lib/helloasso.ts` créé avec :
  - Fonction `getHelloAssoAccessToken()` (OAuth2 client_credentials)
  - Fonction `createHelloAssoCheckoutIntent(params)` : crée un checkout intent, retourne `{ id, redirectUrl }`
  - Typage des réponses API HelloAsso
- [ ] Variables d'env : `VITE_HELLOASSO_CLIENT_ID`, `VITE_HELLOASSO_CLIENT_SECRET`, `VITE_HELLOASSO_ORGANIZATION_SLUG`
- [ ] `.env.example` mis à jour
- [ ] `bun run lint` passe

### Fichiers

- `src/lib/helloasso.ts` (nouveau)
- `.env.example` (modifié)

### Notes

- API HelloAsso v5 : https://api.helloasso.com/v5/
- OAuth2 endpoint : `/oauth2/token`
- Checkout intent endpoint : `/v5/organizations/{organizationSlug}/checkout-intents`
- Le checkout intent retourne une `redirectUrl` utilisable dans une iframe/widget

---

## Issue 3: Composant `HelloAssoWidget`

**Type:** Feature
**Taille:** M

### Acceptance criteria

- [ ] `src/components/HelloAssoWidget.tsx` créé
  - Reçoit `checkoutUrl` en prop
  - Affiche une iframe avec l'URL de checkout HelloAsso
  - Écoute les messages `postMessage` de HelloAsso (success/error/close)
  - Expose les callbacks `onSuccess`, `onError`, `onClose`
- [ ] Affiché dans une modale (`InfoModal` ou nouvelle `PaymentModal`)
- [ ] `bun run lint` passe

### Fichiers

- `src/components/HelloAssoWidget.tsx` (nouveau)

### Notes

- HelloAsso widget communique via `postMessage` — écouter les événements `message` sur `window`
- Événements typiques : `helloasso:checkout:success`, `helloasso:checkout:error`, `helloasso:checkout:close`

---

## Issue 4: Intégrer le widget dans le flux de soumission

**Type:** Feature
**Taille:** M

### Acceptance criteria

- [ ] `handleFormSubmission` dans `InscriptionForm.tsx` :
  - Après `insertMemberWithSubscriptions` réussi
  - Appelle `createHelloAssoCheckoutIntent` avec les infos de l'abonnement
  - Stocke le `helloasso_checkout_intent_id` dans le membre (mise à jour)
  - Affiche le `HelloAssoWidget` dans une modale de paiement
- [ ] Callback `onSuccess` → modale succès + `payment_status` mis à jour à `'paid'`
- [ ] Callback `onError` → bannière d'erreur
- [ ] `payment_method` passe de `'card'` à `'helloasso'`
- [ ] `bun run lint` passe

### Fichiers

- `src/InscriptionForm.tsx` (modifié)
- `src/lib/supabase.ts` (modifié si nécessaire)

---

## Issue 5: Webhook HelloAsso pour confirmation serveur

**Type:** Feature
**Taille:** M

### Acceptance criteria

- [ ] Edge function Supabase `helloasso-webhook` qui reçoit les notifications HelloAsso
- [ ] Vérifie la signature du webhook (clé secrète HelloAsso)
- [ ] Met à jour `payment_status` du subscription concerné (`pending` → `paid` ou `failed`)
- [ ] `bun run lint` passe

### Fichiers

- `supabase/functions/helloasso-webhook/index.ts` (nouveau)

### Notes

- Dépend de l'infrastructure Supabase (Edge Functions)
- HelloAsso envoie des webhooks sur les événements de paiement (Order, Payment)
- Endpoint à configurer via `PUT /partners/me/api-notifications/organizations/{organizationSlug}`

---

## Issue 6: Corriger les bugs HelloAsso détectés via le MCP

**Type:** Bugfix
**Taille:** S

### Contexte

Vérification de l'API HelloAsso via MCP (specs réelles). 3 bugs confirmés.

### Acceptance criteria

- [ ] **Bug 1 — URL OAuth2** : `src/lib/helloasso.ts` utilise une URL séparée pour le token
  - Corriger : `https://api.helloasso.com/oauth2/token` (PAS `https://api.helloasso.com/v5/oauth2/token`)
  - Actuellement `HELLOASSO_API = 'https://api.helloasso.com/v5'` et `${HELLOASSO_API}/oauth2/token` → faux
  - Ajouter `const HELLOASSO_OAUTH_API = 'https://api.helloasso.com/oauth2'`
- [ ] **Bug 2 — `expires_in`** : l'API renvoie `expires_in` en `string`. Parser avant calcul :
  - `const expiresIn = Number(data.expires_in)`
  - `tokenExpiry = Date.now() + (expiresIn - 60) * 1000`
- [ ] **Bug 3 — Signature webhook** : le `signatureKey` provient de la réponse de `PUT /partners/me/api-notifications/...` (champ `signatureKey`), pas d'un secret arbitraire. Documenter dans `supabase/functions/helloasso-webhook/index.ts` que `HELLOASSO_WEBHOOK_SECRET` = ce `signatureKey`
- [ ] `bun run lint` passe

### Fichiers

- `src/lib/helloasso.ts` (modifié)
- `supabase/functions/helloasso-webhook/index.ts` (commentaire/doc uniquement)

### Notes

- Sources (MCP HelloAsso) :
  - Spec `api-authentication-access-token` : `tokenUrl = https://api.helloasso.com/oauth2/token`
  - Spec `HelloAsso API` → `InitCheckoutResponse` : `id` (int), `redirectUrl` (string)
  - `PUT /partners/me/api-notifications/organizations/{slug}` → réponse `ApiUrlNotificationModel` avec `signatureKey`

---

## Issue 7: Sécuriser l'OAuth2 (sortir le `client_secret` du frontend)

**Type:** Refactor (sécurité)
**Taille:** M

### Contexte

`src/lib/helloasso.ts` fait l'OAuth2 `client_credentials` **dans le navigateur**. `VITE_HELLOASSO_CLIENT_SECRET` est donc exposé dans le bundle JS. Le flux `client_credentials` est conçu pour être exécuté côté serveur.

### Acceptance criteria

- [x] Créer une Edge Function Supabase `helloasso-checkout` qui :
  - Obtient le token OAuth2 (client_id + client_secret côté serveur)
  - Crée le checkout intent
  - Retourne `{ id, redirectUrl }` au frontend
- [x] `src/lib/helloasso.ts` n'utilise plus `VITE_HELLOASSO_CLIENT_SECRET`
- [x] Le frontend appelle la fonction via `supabase.functions.invoke('helloasso-checkout', ...)`
- [x] `VITE_HELLOASSO_CLIENT_SECRET` retiré de `.env.example` (remplacé par secret Edge Function)
- [x] `.agents/user-side-setup.md` mis à jour (le secret devient un secret Supabase, pas une var VITE_)
- [x] `bun run lint` passe (sur les fichiers modifiés ; 4 erreurs pré-existantes hors périmètre dans `HelloAssoWidget.tsx`, `supabase.ts`, `InscriptionForm.tsx`)

### Fichiers

- `supabase/functions/helloasso-checkout/index.ts` (nouveau)
- `src/lib/helloasso.ts` (modifié)
- `src/InscriptionForm.tsx` (modifié : appel via `functions.invoke`)
- `.env.example` (modifié)

### Notes

- `client_id` peut rester public ; seul `client_secret` doit être côté serveur
- La migration de `VITE_HELLOASSO_CLIENT_SECRET` → secret Edge Function `HELLOASSO_CLIENT_SECRET` se fait côté user (Supabase CLI)

---

## Issue 8: Ne pas faire confiance au client (montant serveur + contrôle d'accès)

**Type:** Refactor (sécurité)
**Taille:** M

### Contexte

Remonté par l'agent review :
1. `helloasso-checkout` relaye le payload frontend tel quel (`totalAmount`, `itemName`…). Un client modifié peut créer un checkout intent avec un **montant arbitraire**.
2. Pas d'authentification sur l'Edge Function : n'importe qui avec la **anon key** peut l'appeler.

### Acceptance criteria

**Montant calculé côté serveur (ne pas faire confiance au client) :**
- [ ] L'Edge Function `helloasso-checkout` ne reçoit **plus** `totalAmount`/`initialAmount`/`itemName` du client
- [ ] Elle reçoit uniquement `planId` (et `memberId` pour stocker le checkout intent)
- [ ] Elle lit le **prix et la durée depuis la table `subscription_plans`** (côté serveur)
- [ ] Elle construit `itemName` et les montants en cents à partir de la donnée DB
- [ ] Elle vérifie que le plan existe et est `active` → sinon erreur 400

**Contrôle d'accès (Option C — décidée) :**
- [ ] Frontend : `supabase.auth.signInAnonymously()` au chargement → JWT anon
- [ ] Edge Function : vérifier le JWT via `supabase.auth.getUser(token)` (contexte `Authorization: Bearer`)
- [ ] Rejet 401 si le token est absent/invalide
- [ ] Rate-limit par `sub` (user anon) **+ IP** : max 5 checkouts / 10 min (stockage simple : table `checkout_rate_limits` ou cache mémoire)

**Côté frontend :**
- [ ] `src/InscriptionForm.tsx` envoie `planId`/`memberId` au lieu des montants
- [ ] `bun run lint` passe (sur les fichiers modifiés)

### Fichiers

- `supabase/functions/helloasso-checkout/index.ts` (modifié)
- `src/InscriptionForm.tsx` (modifié)
- `src/lib/helloasso.ts` (modifié si nécessaire)
- `src/lib/supabase.ts` (modifié si nécessaire : init anon auth)

### Notes

- La source de vérité du prix est la table `subscription_plans`, pas le navigateur
- Décision : Option C = anon auth (JWT) + rate-limit par `sub`+IP
- Le JWT anon est obtenu avec l'anon key publique → il prouve l'usage du SDK mais n'est pas une preuve d'identité ; le vrai verrou = montant calculé côté serveur
- Le rate-limit protège contre le spam/création massive de checkouts

---

## Issue 9: Rendre les URLs HelloAsso configurables (sandbox vs production)

**Type:** Feature
**Taille:** S

### Contexte

Le sandbox HelloAsso utilise des URLs différentes de la production :
- Prod API : `https://api.helloasso.com`
- Sandbox API : `https://api.helloasso-sandbox.com`
- Prod widget/iframe : `https://www.helloasso.com`
- Sandbox widget/iframe : `https://www.helloasso-sandbox.com`

Actuellement `helloasso.ts` et l'Edge Function `helloasso-checkout` hardcodent les URLs de prod.

### Acceptance criteria

- [ ] `src/lib/helloasso.ts` : base URL pilotée par env (`VITE_HELLOASSO_API_URL` ou flag `VITE_HELLOASSO_ENV=sandbox|production`)
- [ ] Edge Function `helloasso-checkout` : base URL pilotée par secret Supabase (`HELLOASSO_API_URL` ou `HELLOASSO_ENV`)
- [ ] `src/components/HelloAssoWidget.tsx` : l'iframe accepte l'origine sandbox OU prod (déjà partiellement géré — vérifier)
- [ ] `.env.example` documente la var (ex: `VITE_HELLOASSO_ENV=sandbox`)
- [ ] `bun run lint` passe (fichiers modifiés)

### Fichiers

- `src/lib/helloasso.ts` (modifié)
- `supabase/functions/helloasso-checkout/index.ts` (modifié)
- `src/components/HelloAssoWidget.tsx` (vérifier)
- `.env.example` (modifié)

### Notes

- Sources (doc HelloAsso) :
  - API sandbox : `https://api.helloasso-sandbox.com/oauth2`
  - Création asso de test : `https://auth.helloasso-sandbox.com/inscription`
  - Site sandbox : `https://www.helloasso-sandbox.com`
