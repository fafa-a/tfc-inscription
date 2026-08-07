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
- Endpoint à configurer dans le dashboard HelloAsso
